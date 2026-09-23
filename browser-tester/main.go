package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/chromedp/chromedp"
)

type result struct {
	Status         string `json:"status"`
	URL            string `json:"url"`
	ResponseTimeMs int64  `json:"responseTimeMs"`
	Error          string `json:"error,omitempty"`
}

// main reads TARGET_URL from the environment (set via an ECS RunTask
// container override in production, or by hand for local testing), runs one
// browser test, and writes the result either to S3 (if RESULTS_BUCKET is
// set) or to a local directory — so this same binary can be exercised with
// `docker run` before any AWS involvement.
func main() {
	targetURL := os.Getenv("TARGET_URL")
	if targetURL == "" {
		log.Fatal("TARGET_URL environment variable is required")
	}

	testID := os.Getenv("TEST_ID")
	if testID == "" {
		testID = fmt.Sprintf("local-%d", time.Now().UnixNano())
	}

	outputDir := os.Getenv("OUTPUT_DIR")
	if outputDir == "" {
		outputDir = "."
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	capture, captureErr := captureSite(ctx, targetURL)

	res := result{URL: targetURL}
	if captureErr != nil {
		res.Status = "error"
		res.Error = captureErr.Error()
	} else {
		res.Status = "ok"
		res.ResponseTimeMs = capture.responseTime.Milliseconds()
	}

	if err := writeResults(ctx, testID, outputDir, res, capture.png); err != nil {
		log.Fatalf("failed to write results: %v", err)
	}

	resJSON, _ := json.Marshal(res)
	fmt.Println(string(resJSON))

	if captureErr != nil {
		os.Exit(1)
	}
}

type captureResult struct {
	responseTime time.Duration
	png          []byte
}

// captureSite navigates Chrome to the URL and captures a screenshot.
// Adapted from backend/main.go's captureSite for running inside a container:
// adds an explicit no-sandbox allocator (Chromium refuses to launch as root
// without it) and relies on the caller-supplied context deadline instead of
// running unbounded, since a hung page on Fargate would otherwise bill
// indefinitely.
func captureSite(ctx context.Context, siteURL string) (captureResult, error) {
	allocCtx, allocCancel := chromedp.NewExecAllocator(ctx, append(
		chromedp.DefaultExecAllocatorOptions[:],
		chromedp.NoSandbox,
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("mute-audio", true),
	)...)
	defer allocCancel()

	taskCtx, taskCancel := chromedp.NewContext(allocCtx)
	defer taskCancel()

	var screenshot []byte
	start := time.Now()

	if err := chromedp.Run(taskCtx,
		chromedp.EmulateViewport(1280, 720),
		chromedp.Navigate(siteURL),
		chromedp.WaitReady("body", chromedp.ByQuery),
		chromedp.CaptureScreenshot(&screenshot),
	); err != nil {
		return captureResult{}, fmt.Errorf("failed to capture URL in Chrome: %w", err)
	}

	return captureResult{
		responseTime: time.Since(start),
		png:          screenshot,
	}, nil
}

func writeResults(ctx context.Context, testID, outputDir string, res result, png []byte) error {
	if bucket := os.Getenv("RESULTS_BUCKET"); bucket != "" {
		return uploadToS3(ctx, bucket, testID, res, png)
	}
	return writeLocal(outputDir, testID, res, png)
}

func writeLocal(outputDir, testID string, res result, png []byte) error {
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return err
	}

	if len(png) > 0 {
		if err := os.WriteFile(filepath.Join(outputDir, testID+".png"), png, 0o644); err != nil {
			return err
		}
	}

	resJSON, err := json.Marshal(res)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(outputDir, testID+".json"), resJSON, 0o644)
}

func uploadToS3(ctx context.Context, bucket, testID string, res result, png []byte) error {
	var opts []func(*config.LoadOptions) error
	if region := os.Getenv("RESULTS_BUCKET_REGION"); region != "" {
		opts = append(opts, config.WithRegion(region))
	}
	cfg, err := config.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return fmt.Errorf("load AWS config: %w", err)
	}
	client := s3.NewFromConfig(cfg)

	if len(png) > 0 {
		if _, err := client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(bucket),
			Key:         aws.String("results/" + testID + ".png"),
			Body:        bytes.NewReader(png),
			ContentType: aws.String("image/png"),
		}); err != nil {
			return fmt.Errorf("upload screenshot: %w", err)
		}
	}

	resJSON, err := json.Marshal(res)
	if err != nil {
		return err
	}

	if _, err := client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String("results/" + testID + ".json"),
		Body:        bytes.NewReader(resJSON),
		ContentType: aws.String("application/json"),
	}); err != nil {
		return fmt.Errorf("upload result json: %w", err)
	}

	return nil
}
