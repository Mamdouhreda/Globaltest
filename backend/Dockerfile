# Build the Go binary in a full toolchain image...
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go fargate.go ./
# Built natively as arm64 (this Mac's Docker platform, same as browser-tester)
# rather than cross-compiled — Lambda supports arm64 directly, it's ~20%
# cheaper per invocation, and it skips needing buildx. The binary name
# "bootstrap" is what the Lambda base image below expects to run.
RUN CGO_ENABLED=0 GOARCH=arm64 go build -tags lambda.norpc -ldflags="-s -w" -o /src/bootstrap .

# AWS's Lambda base image for compiled/self-contained runtimes (Go has never
# had its own managed Lambda runtime image — aws-lambda-go's lambda.Start
# speaks the Lambda Runtime API directly against this OS-only base). Unlike
# browser-tester, this image does NOT need Chromium — the backend is the
# control plane; it triggers Fargate tasks to do the browser work rather
# than running a browser itself. (The local-dev code path in main.go still
# runs Chromium directly via chromedp, so that path won't work inside this
# container — it's only reachable via `go run .` outside Lambda/Docker.)
FROM public.ecr.aws/lambda/provided:al2023

COPY --from=builder /src/bootstrap ./bootstrap

ENTRYPOINT ["./bootstrap"]
