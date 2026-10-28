# Build the Go binary in a full toolchain image...
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /browser-tester .

# ...then run it on top of a minimal Chromium image instead of the full
# golang/debian base, since this image's size is what drives both ECR
# storage cost and Fargate cold-start time on every test run.
FROM chromedp/headless-shell:latest

# ffmpeg encodes the scroll recording into an MP4. A static build is ~100MB,
# where Debian's ffmpeg package and its libraries add ~400MB.
COPY --from=mwader/static-ffmpeg:7.1.1 /ffmpeg /usr/local/bin/ffmpeg

COPY --from=builder /browser-tester /browser-tester
# headless-shell ships without a system CA bundle; the AWS SDK needs one to
# talk TLS to S3 (Chromium itself uses its own built-in trust store).
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

ENTRYPOINT ["/browser-tester"]
