package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"
)

type result struct {
	Status         string `json:"status"`
	URL            string `json:"url"`
	ResponseTimeMs int64  `json:"responseTimeMs"`
	Error          string `json:"error,omitempty"`
	HasVideo       bool   `json:"hasVideo,omitempty"`
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

	// Room for the page load, the scroll recording (at most ~14s) and the
	// MP4 encode.
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Recording a scroll video is opt-in (RECORD_VIDEO=true), since it adds
	// time and cost to every test.
	recordVideo := os.Getenv("RECORD_VIDEO") == "true"

	capture, captureErr := captureSite(ctx, targetURL, recordVideo)

	res := result{URL: targetURL}
	if captureErr != nil {
		res.Status = "error"
		res.Error = captureErr.Error()
	} else {
		res.Status = "ok"
		res.ResponseTimeMs = capture.responseTime.Milliseconds()
		res.HasVideo = len(capture.mp4) > 0
	}

	if err := writeResults(ctx, testID, outputDir, res, capture.png, capture.mp4); err != nil {
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
	// mp4 is a video of the page scrolling top to bottom. It is nil if the
	// recording failed, which doesn't fail the test.
	mp4 []byte
}

// captureSite navigates Chrome to the URL, captures a screenshot, then (if
// recordVideo is set) records a video of the page scrolling.
// Adapted from backend/main.go's captureSite for running inside a container:
// adds an explicit no-sandbox allocator (Chromium refuses to launch as root
// without it) and relies on the caller-supplied context deadline instead of
// running unbounded, since a hung page on Fargate would otherwise bill
// indefinitely. All of Chromium's traffic goes through the proxy in proxy.go,
// so it can only reach public addresses.
func captureSite(ctx context.Context, siteURL string, recordVideo bool) (captureResult, error) {
	if err := checkTargetURL(ctx, siteURL); err != nil {
		return captureResult{}, err
	}

	proxyAddr, stopProxy, err := startPublicProxy()
	if err != nil {
		return captureResult{}, fmt.Errorf("start proxy: %w", err)
	}
	defer stopProxy()

	allocCtx, allocCancel := chromedp.NewExecAllocator(ctx, append(
		chromedp.DefaultExecAllocatorOptions[:],
		chromedp.NoSandbox,
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("mute-audio", true),
		chromedp.ProxyServer("http://"+proxyAddr),
		// Chromium skips the proxy for localhost unless told otherwise.
		chromedp.Flag("proxy-bypass-list", "<-loopback>"),
		// WebRTC's UDP doesn't go through an http proxy at all.
		chromedp.Flag("force-webrtc-ip-handling-policy", "disable_non_proxied_udp"),
		// The scroll video records the window, not the emulated viewport,
		// so the window must match it.
		chromedp.WindowSize(1280, 720),
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

	responseTime := time.Since(start)

	if !recordVideo {
		return captureResult{responseTime: responseTime, png: screenshot}, nil
	}

	// Stop recording well before the deadline, so a slow page still leaves
	// time to upload the screenshot and result.
	recordCtx := taskCtx
	if deadline, ok := ctx.Deadline(); ok {
		var recordCancel context.CancelFunc
		recordCtx, recordCancel = context.WithDeadline(taskCtx, deadline.Add(-10*time.Second))
		defer recordCancel()
	}

	mp4, err := recordScroll(recordCtx)
	if err != nil {
		log.Printf("scroll video skipped: %v", err)
	}

	return captureResult{
		responseTime: responseTime,
		png:          screenshot,
		mp4:          mp4,
	}, nil
}

type screencastFrame struct {
	jpeg []byte
	at   time.Time
}

// scrollScript pauses at the top, scrolls to the bottom (or until the page
// stops moving, say when a popup locks scrolling, or for at most 12s, for
// pages that load more as you scroll), then pauses at the bottom.
const scrollScript = `new Promise(resolve => {
	const pause = ms => new Promise(r => setTimeout(r, ms));
	pause(1000).then(() => {
		const started = Date.now();
		let lastY = -1;
		let still = 0;
		const timer = setInterval(() => {
			window.scrollBy(0, 40);
			still = window.scrollY === lastY ? still + 1 : 0;
			lastY = window.scrollY;
			const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
			if (atBottom || still > 30 || Date.now() - started > 12000) {
				clearInterval(timer);
				pause(1000).then(() => resolve(true));
			}
		}, 16);
	});
})`

// recordScroll records Chrome's screen with the DevTools screencast while
// scrollScript runs, and encodes the frames as an MP4.
func recordScroll(ctx context.Context) ([]byte, error) {
	var (
		mu     sync.Mutex
		frames []screencastFrame
	)

	chromedp.ListenTarget(ctx, func(ev any) {
		frame, ok := ev.(*page.EventScreencastFrame)
		if !ok {
			return
		}
		at := time.Now()
		if frame.Metadata != nil && frame.Metadata.Timestamp != nil {
			at = frame.Metadata.Timestamp.Time()
		}
		if data, err := base64.StdEncoding.DecodeString(frame.Data); err == nil {
			mu.Lock()
			frames = append(frames, screencastFrame{jpeg: data, at: at})
			mu.Unlock()
		}
		// Chrome stops sending frames until each one is acked. Listeners
		// must not block, so ack from a goroutine.
		go func() {
			c := chromedp.FromContext(ctx)
			_ = page.ScreencastFrameAck(frame.SessionID).Do(cdp.WithExecutor(ctx, c.Target))
		}()
	})

	var done bool
	if err := chromedp.Run(ctx,
		page.StartScreencast().
			WithFormat(page.ScreencastFormatJpeg).
			WithQuality(70).
			WithMaxWidth(960).
			WithMaxHeight(540),
		chromedp.Evaluate(scrollScript, &done, func(p *runtime.EvaluateParams) *runtime.EvaluateParams {
			return p.WithAwaitPromise(true)
		}),
		page.StopScreencast(),
	); err != nil {
		return nil, fmt.Errorf("record scroll: %w", err)
	}
	ended := time.Now()

	mu.Lock()
	defer mu.Unlock()
	return encodeMP4(ctx, frames, ended)
}

// videoFPS is the frame rate of the scroll video.
const videoFPS = 24

// encodeMP4 turns screencast frames into an H.264 MP4 with ffmpeg. Chrome
// only sends a frame when the page changes, so the frames are resampled to a
// steady rate first: each video frame is the latest one Chrome had sent by
// then, and the last is held until the recording ended. (ffmpeg's concat
// demuxer can do this from per-frame durations, but it dropped the ~17ms
// frames of a scroll, so the video never moved.)
func encodeMP4(ctx context.Context, frames []screencastFrame, ended time.Time) ([]byte, error) {
	if len(frames) < 2 {
		return nil, fmt.Errorf("only %d screencast frames captured", len(frames))
	}
	sort.Slice(frames, func(i, j int) bool { return frames[i].at.Before(frames[j].at) })

	dir, err := os.MkdirTemp("", "scroll-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	start := frames[0].at
	length := ended.Sub(start)
	if last := frames[len(frames)-1].at.Sub(start); length < last {
		length = last
	}
	count := int(length.Seconds()*videoFPS) + 1

	source, written := 0, -1
	var previous string
	for i := 0; i < count; i++ {
		at := start.Add(time.Duration(float64(i) * float64(time.Second) / videoFPS))
		for source+1 < len(frames) && !frames[source+1].at.After(at) {
			source++
		}
		name := filepath.Join(dir, fmt.Sprintf("frame-%05d.jpg", i))
		// A frame shown again is a hard link to its first copy, not another
		// write of the JPEG.
		if source == written {
			err = os.Link(previous, name)
		} else {
			err = os.WriteFile(name, frames[source].jpeg, 0o644)
		}
		if err != nil {
			return nil, err
		}
		written, previous = source, name
	}

	out := filepath.Join(dir, "scroll.mp4")
	cmd := exec.CommandContext(ctx, "ffmpeg", "-hide_banner", "-loglevel", "error",
		"-framerate", strconv.Itoa(videoFPS), "-i", filepath.Join(dir, "frame-%05d.jpg"),
		"-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
		"-c:v", "libx264", "-preset", "veryfast", "-crf", "32",
		"-pix_fmt", "yuv420p", "-movflags", "+faststart",
		out,
	)
	if output, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("ffmpeg: %w: %s", err, output)
	}

	return os.ReadFile(out)
}

func writeResults(ctx context.Context, testID, outputDir string, res result, png, mp4 []byte) error {
	if bucket := os.Getenv("RESULTS_BUCKET"); bucket != "" {
		return uploadToS3(ctx, bucket, testID, res, png, mp4)
	}
	return writeLocal(outputDir, testID, res, png, mp4)
}

func writeLocal(outputDir, testID string, res result, png, mp4 []byte) error {
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return err
	}

	if len(png) > 0 {
		if err := os.WriteFile(filepath.Join(outputDir, testID+".png"), png, 0o644); err != nil {
			return err
		}
	}

	if len(mp4) > 0 {
		if err := os.WriteFile(filepath.Join(outputDir, testID+".mp4"), mp4, 0o644); err != nil {
			return err
		}
	}

	resJSON, err := json.Marshal(res)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(outputDir, testID+".json"), resJSON, 0o644)
}

func uploadToS3(ctx context.Context, bucket, testID string, res result, png, mp4 []byte) error {
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

	if len(mp4) > 0 {
		if _, err := client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(bucket),
			Key:         aws.String("results/" + testID + ".mp4"),
			Body:        bytes.NewReader(mp4),
			ContentType: aws.String("video/mp4"),
		}); err != nil {
			return fmt.Errorf("upload video: %w", err)
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
