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

COPY --from=builder /browser-tester /browser-tester

ENTRYPOINT ["/browser-tester"]
