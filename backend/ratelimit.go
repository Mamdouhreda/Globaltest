package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

const turnstileVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// turnstileTimeout leaves room in the Lambda's 10s limit for the counters and
// RunTask that follow the check.
const turnstileTimeout = 3 * time.Second

// counterLifetime is how long a counter row outlives its day before
// DynamoDB's TTL removes it.
const counterLifetime = 48 * time.Hour

const (
	userLimitMessage   = "You've used today's free tests. Try again tomorrow."
	globalLimitMessage = "All of today's free tests have been used. Try again tomorrow."
)

// dailyCounter is one limit a test has to pass.
type dailyCounter struct {
	key     string
	limit   int
	message string
}

// allowTest decides whether a Fargate test may start, and writes the error
// response if it may not. A test costs money, so anything going wrong here
// refuses the test instead of letting it through.
func allowTest(w http.ResponseWriter, r *http.Request, token string) bool {
	ctx := r.Context()

	ip, err := clientIP(r.RemoteAddr)
	if err != nil {
		log.Printf("rate limit: %v", err)
		http.Error(w, "couldn't identify the client", http.StatusInternalServerError)
		return false
	}

	// Left empty, the bot check is off: there are no Turnstile keys yet, or
	// this is local dev.
	if secret := os.Getenv("TURNSTILE_SECRET_KEY"); secret != "" {
		human, err := verifyTurnstile(ctx, turnstileVerifyURL, secret, token, ip)
		if err != nil {
			log.Printf("turnstile: %v", err)
			http.Error(w, "couldn't run the bot check", http.StatusBadGateway)
			return false
		}
		if !human {
			http.Error(w, "The bot check didn't pass. Refresh the page and try again.", http.StatusForbidden)
			return false
		}
	}

	table := os.Getenv("RATE_LIMIT_TABLE")
	if table == "" {
		// Only local dev runs without the table; on Lambda it's a broken deploy.
		if os.Getenv("AWS_LAMBDA_RUNTIME_API") == "" {
			return true
		}
		log.Print("rate limit: RATE_LIMIT_TABLE is not set")
		http.Error(w, "rate limiting is unavailable", http.StatusServiceUnavailable)
		return false
	}

	counters, err := loadDailyCounters(ip, time.Now().UTC())
	if err != nil {
		log.Printf("rate limit: %v", err)
		http.Error(w, "rate limiting is unavailable", http.StatusServiceUnavailable)
		return false
	}

	awsCfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Printf("rate limit: %v", err)
		http.Error(w, "rate limiting is unavailable", http.StatusServiceUnavailable)
		return false
	}
	client := dynamodb.NewFromConfig(awsCfg)
	now := time.Now().UTC()

	for _, counter := range counters {
		allowed, err := takeFromCounter(ctx, client, table, counter, now.Add(counterLifetime))
		if err != nil {
			log.Printf("rate limit: %s: %v", counter.key, err)
			http.Error(w, "rate limiting is unavailable", http.StatusServiceUnavailable)
			return false
		}
		if !allowed {
			if counter.message == globalLimitMessage {
				log.Printf("rate limit: global daily cap of %d reached", counter.limit)
			}
			w.Header().Set("Retry-After", strconv.Itoa(secondsUntilTomorrow(now)))
			http.Error(w, counter.message, http.StatusTooManyRequests)
			return false
		}
	}
	return true
}

// clientIP parses the address API Gateway saw the connection come from. On
// Lambda, RemoteAddr is a bare IP from the request context; a local server
// adds a port. X-Forwarded-For isn't used because a client can write to it.
func clientIP(remoteAddr string) (netip.Addr, error) {
	if addrPort, err := netip.ParseAddrPort(remoteAddr); err == nil {
		return addrPort.Addr().Unmap(), nil
	}
	addr, err := netip.ParseAddr(remoteAddr)
	if err != nil {
		return netip.Addr{}, fmt.Errorf("invalid client address %q: %w", remoteAddr, err)
	}
	return addr.Unmap(), nil
}

func loadDailyCounters(ip netip.Addr, now time.Time) ([]dailyCounter, error) {
	perIP, err := limitFromEnv("RATE_LIMIT_PER_IP")
	if err != nil {
		return nil, err
	}
	perRange, err := limitFromEnv("RATE_LIMIT_PER_RANGE")
	if err != nil {
		return nil, err
	}
	global, err := limitFromEnv("RATE_LIMIT_GLOBAL")
	if err != nil {
		return nil, err
	}
	return dailyCounters(ip, now, perIP, perRange, global), nil
}

func limitFromEnv(name string) (int, error) {
	limit, err := strconv.Atoi(os.Getenv(name))
	if err != nil {
		return 0, fmt.Errorf("%s: %w", name, err)
	}
	return limit, nil
}

// dailyCounters lists the counters a test takes from, in the order they're
// checked. The shared global counter comes last so a request blocked by its
// own limit doesn't use up the pool everyone else depends on.
//
// One IPv6 customer usually holds a whole /64, so that's what counts as one
// address, and a /48 is the matching "range" to an IPv4 /24.
func dailyCounters(ip netip.Addr, now time.Time, perIP, perRange, global int) []dailyCounter {
	day := now.Format("2006-01-02")

	address, network := netip.PrefixFrom(ip, 32), netip.PrefixFrom(ip, 24)
	if ip.Is6() {
		address, network = netip.PrefixFrom(ip, 64), netip.PrefixFrom(ip, 48)
	}

	return []dailyCounter{
		{key: "ip#" + address.Masked().String() + "#" + day, limit: perIP, message: userLimitMessage},
		{key: "net#" + network.Masked().String() + "#" + day, limit: perRange, message: userLimitMessage},
		{key: "global#" + day, limit: global, message: globalLimitMessage},
	}
}

// takeFromCounter counts one test against the counter, unless it's already at
// its limit. Doing both in one conditional update keeps parallel requests from
// slipping past the limit.
func takeFromCounter(ctx context.Context, client *dynamodb.Client, table string, counter dailyCounter, expires time.Time) (bool, error) {
	_, err := client.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(table),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: counter.key},
		},
		UpdateExpression:    aws.String("ADD tests :one SET expiresAt = :expires"),
		ConditionExpression: aws.String("attribute_not_exists(tests) OR tests < :limit"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":one":     &types.AttributeValueMemberN{Value: "1"},
			":limit":   &types.AttributeValueMemberN{Value: strconv.Itoa(counter.limit)},
			":expires": &types.AttributeValueMemberN{Value: strconv.FormatInt(expires.Unix(), 10)},
		},
	})
	if err != nil {
		var limitReached *types.ConditionalCheckFailedException
		if errors.As(err, &limitReached) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// secondsUntilTomorrow is when the daily counters reset, at midnight UTC.
func secondsUntilTomorrow(now time.Time) int {
	tomorrow := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
	return int(tomorrow.Sub(now).Seconds())
}

// verifyTurnstile asks Cloudflare whether a token from the frontend's widget
// is genuine. Each token only passes once.
func verifyTurnstile(ctx context.Context, verifyURL, secret, token string, ip netip.Addr) (bool, error) {
	if token == "" {
		return false, nil
	}

	ctx, cancel := context.WithTimeout(ctx, turnstileTimeout)
	defer cancel()

	form := url.Values{"secret": {secret}, "response": {token}, "remoteip": {ip.String()}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, verifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}
	return result.Success, nil
}
