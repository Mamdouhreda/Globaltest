package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/chromedp/chromedp"
)

type urlRequest struct {
	URL string `json:"url"`
	// Region selects which AWS region runs the test: "uk", "us", or
	// "germany". Left empty (or "local") to run Chromium locally instead —
	// the original dev-time behavior, kept as a fallback for testing
	// without any AWS infrastructure deployed.
	Region string `json:"region,omitempty"`
}

type urlResponse struct {
	Status         string `json:"status"`
	URL            string `json:"url"`
	ResponseTimeMs int64  `json:"responseTimeMs,omitempty"`
	Screenshot     string `json:"screenshot,omitempty"`
	// TaskArn is set instead of Screenshot when the test ran as a Fargate
	// task — there's no result-polling yet (that needs the S3 bucket and
	// task definition from later steps), so a region-based request only
	// confirms the task started, it doesn't return a screenshot yet.
	TaskArn string `json:"taskArn,omitempty"`
}

// main registers the backend routes, then either starts a Lambda runtime
// loop (when running inside Lambda) or a plain HTTP server (local dev).
// AWS_LAMBDA_RUNTIME_API is set by the Lambda service and nothing else, so
// its presence is what decides which mode to run in.
func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /url", receiveURL)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Backend is running")
	})
	handler := withCORS(mux)

	if os.Getenv("AWS_LAMBDA_RUNTIME_API") != "" {
		lambda.Start(httpadapter.NewV2(handler).ProxyWithContext)
		return
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Printf("backend running on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

// receiveURL reads a submitted URL and region. With no region (or "local"),
// it opens the URL in Chrome locally and returns a screenshot, same as
// before. With a region, it launches a Fargate task there instead — see
// runBrowserTestTask in fargate.go.
func receiveURL(w http.ResponseWriter, r *http.Request) {
	var request urlRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if request.URL == "" {
		http.Error(w, "url is required", http.StatusBadRequest)
		return
	}

	if request.Region == "" || request.Region == "local" {
		receiveURLLocal(w, request.URL)
		return
	}

	receiveURLFargate(w, r, request.URL, request.Region)
}

func receiveURLLocal(w http.ResponseWriter, url string) {
	fmt.Printf("received URL (local): %s\n", url)

	result, err := captureSite(url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	fmt.Printf("response time: %dms\n", result.responseTime.Milliseconds())

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(urlResponse{
		Status:         "ok",
		URL:            url,
		ResponseTimeMs: result.responseTime.Milliseconds(),
		Screenshot:     "data:image/png;base64," + base64.StdEncoding.EncodeToString(result.screenshot),
	})
}

func receiveURLFargate(w http.ResponseWriter, r *http.Request, url, region string) {
	cfg, ok := loadRegionConfigs()[region]
	if !ok {
		http.Error(w, fmt.Sprintf("unknown region %q (expected uk, us, or germany)", region), http.StatusBadRequest)
		return
	}

	fmt.Printf("received URL (region=%s): %s\n", region, url)

	taskArn, err := runBrowserTestTask(r.Context(), cfg, url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(urlResponse{
		Status:  "started",
		URL:     url,
		TaskArn: taskArn,
	})
}

type captureResult struct {
	responseTime time.Duration
	screenshot   []byte
}

// captureSite navigates Chrome to the URL and captures a screenshot.
func captureSite(siteURL string) (captureResult, error) {
	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	var screenshot []byte
	start := time.Now()
	// wait for the page to load and capture the screenshot

	if err := chromedp.Run(ctx,
		chromedp.EmulateViewport(1280, 720),
		chromedp.Navigate(siteURL),
		chromedp.WaitReady("body", chromedp.ByQuery),
		chromedp.CaptureScreenshot(&screenshot),
	); err != nil {
		return captureResult{}, fmt.Errorf("failed to capture URL in Chrome: %w", err)
	}

	return captureResult{
		responseTime: time.Since(start),
		screenshot:   screenshot,
	}, nil
}

// withCORS allows the React frontend to send requests to this backend.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s ", r.Method, r.URL.Path)

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
