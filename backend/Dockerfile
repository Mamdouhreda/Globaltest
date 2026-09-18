# Build the Go binary in a full toolchain image...
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go fargate.go ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /backend .

# ...then run it on the smallest possible base. Unlike browser-tester, this
# image does NOT need Chromium — the backend is the control plane; it's
# meant to trigger Fargate tasks to do the browser work, not run a browser
# itself. (Today it still does run Chromium locally via chromedp, so
# POST /url will fail in this container until that gets wired to Fargate —
# see backend/fargate.go.)
FROM gcr.io/distroless/static-debian12

COPY --from=builder /backend /backend

EXPOSE 8080
ENTRYPOINT ["/backend"]
