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
	"github.com/chromedp/chromedp"
)

type urlRequest struct {
	URL string `json:"url"`
}

type urlResponse struct {
	Status         string `json:"status"`
	URL            string `json:"url"`
	ResponseTimeMs int64  `json:"responseTimeMs"`
	Screenshot     string `json:"screenshot"`
}

// main starts the HTTP server and registers the backend routes.
func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /url", receiveURL)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Backend is running")
	})

	addr := ":" + port
	log.Printf("backend running on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, withCORS(mux)); err != nil {
		log.Fatal(err)
	}
}

// receiveURL reads a submitted URL, opens it in Chrome, and returns screenshot.
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

	fmt.Printf("received URL: %s\n", request.URL)

	result, err := captureSite(request.URL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	fmt.Printf("response time: %dms\n", result.responseTime.Milliseconds())

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(urlResponse{
		Status:         "ok",
		URL:            request.URL,
		ResponseTimeMs: result.responseTime.Milliseconds(),
		Screenshot:     "data:image/png;base64," + base64.StdEncoding.EncodeToString(result.screenshot),
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
