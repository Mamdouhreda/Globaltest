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
	"sort"
	"strconv"
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
