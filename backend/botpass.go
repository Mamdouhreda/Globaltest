package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"
)

// A Turnstile token only passes once, but one run sends a request per country.
// So a visitor does the check once and gets a pass that covers the whole run.
// It's tied to their IP and every test still counts against the daily limits,
// so a pass doesn't buy any extra tests.
const botPassLifetime = 10 * time.Minute

// botPassSignature signs with the Turnstile secret, so there's no second key to
// manage. A new secret just invalidates the passes in circulation.
func botPassSignature(secret string, ip netip.Addr, expires string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("bot-pass|" + ip.String() + "|" + expires))
	return hex.EncodeToString(mac.Sum(nil))
}

func issueBotPass(secret string, ip netip.Addr, now time.Time) string {
	expires := strconv.FormatInt(now.Add(botPassLifetime).Unix(), 10)
	return expires + "." + botPassSignature(secret, ip, expires)
}

func validBotPass(secret, pass string, ip netip.Addr, now time.Time) bool {
	expires, signature, found := strings.Cut(pass, ".")
	if !found {
		return false
	}
	expiresAt, err := strconv.ParseInt(expires, 10, 64)
	if err != nil || now.Unix() >= expiresAt {
		return false
	}
	return hmac.Equal([]byte(signature), []byte(botPassSignature(secret, ip, expires)))
}

type verifyRequest struct {
	Token string `json:"token"`
}

type verifyResponse struct {
	Pass string `json:"pass"`
}

// receiveVerify swaps a Turnstile token for a pass. With no secret configured
// the bot check is off, so the empty pass it returns is all a test needs.
func receiveVerify(w http.ResponseWriter, r *http.Request) {
	var request verifyRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	ip, err := clientIP(r.RemoteAddr)
	if err != nil {
		log.Printf("bot pass: %v", err)
		http.Error(w, "couldn't identify the client", http.StatusInternalServerError)
		return
	}

	var response verifyResponse
	if secret := os.Getenv("TURNSTILE_SECRET_KEY"); secret != "" {
		human, err := verifyTurnstile(r.Context(), turnstileVerifyURL, secret, request.Token, ip)
		if err != nil {
			log.Printf("turnstile: %v", err)
			http.Error(w, "couldn't run the bot check", http.StatusBadGateway)
			return
		}
		if !human {
			http.Error(w, botCheckFailedMessage, http.StatusForbidden)
			return
		}
		response.Pass = issueBotPass(secret, ip, time.Now())
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
