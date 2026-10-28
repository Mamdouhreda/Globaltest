package main

// Scroll video recording for local tests. Kept in step with
// browser-tester/main.go, which records the same way on Fargate.

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"
)

type screencastFrame struct {
	jpeg []byte
	at   time.Time
}

// scrollScript pauses at the top, scrolls to the bottom (or for at most 12s,
// for pages that load more as you scroll), then pauses at the bottom.
const scrollScript = `new Promise(resolve => {
	const pause = ms => new Promise(r => setTimeout(r, ms));
	pause(1000).then(() => {
		const started = Date.now();
		const timer = setInterval(() => {
			window.scrollBy(0, 40);
			const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
			if (atBottom || Date.now() - started > 12000) {
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

	mu.Lock()
	defer mu.Unlock()
	return encodeMP4(ctx, frames)
}

// encodeMP4 turns screencast frames into an H.264 MP4 with ffmpeg. Chrome
// only sends a frame when the page changes, so each frame is shown until the
// next one arrived, via ffmpeg's concat demuxer durations.
func encodeMP4(ctx context.Context, frames []screencastFrame) ([]byte, error) {
	if len(frames) < 2 {
		return nil, fmt.Errorf("only %d screencast frames captured", len(frames))
	}

	dir, err := os.MkdirTemp("", "scroll-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	var list strings.Builder
	for i, frame := range frames {
		name := fmt.Sprintf("frame-%05d.jpg", i)
		if err := os.WriteFile(filepath.Join(dir, name), frame.jpeg, 0o644); err != nil {
			return nil, err
		}
		duration := 1.0 / 30
		if i+1 < len(frames) {
			duration = frames[i+1].at.Sub(frame.at).Seconds()
		}
		fmt.Fprintf(&list, "file '%s'\nduration %.4f\n", name, duration)
	}
	// The concat demuxer ignores the last frame's duration unless the frame
	// is listed again.
	fmt.Fprintf(&list, "file 'frame-%05d.jpg'\n", len(frames)-1)

	if err := os.WriteFile(filepath.Join(dir, "list.txt"), []byte(list.String()), 0o644); err != nil {
		return nil, err
	}

	out := filepath.Join(dir, "scroll.mp4")
	cmd := exec.CommandContext(ctx, "ffmpeg", "-hide_banner", "-loglevel", "error",
		"-f", "concat", "-safe", "0", "-i", filepath.Join(dir, "list.txt"),
		"-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=24",
		"-c:v", "libx264", "-preset", "veryfast", "-crf", "32",
		"-pix_fmt", "yuv420p", "-movflags", "+faststart",
		out,
	)
	if output, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("ffmpeg: %w: %s", err, output)
	}

	return os.ReadFile(out)
}
