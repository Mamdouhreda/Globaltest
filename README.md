# GlobalTest

See what your website actually looks like from the other side of the world.

GlobalTest lets you drop in a URL, pick a region, and get back a real screenshot taken by a real Chromium browser running in that region — not a simulated check, an actual browser opening your site the way a visitor there would see it. The whole thing is built to scale to zero: when nobody's testing anything, nothing is running and nothing costs money.

## How it works

A Go backend receives the request and, once it's fully wired up, launches an on-demand AWS Fargate task in the region you picked. That task runs Chromium, navigates to your URL, grabs a screenshot, and hands the result back. No servers sit around waiting between tests.

If you want the full architecture story — why Fargate over EC2, why no NAT gateway, how regions get added — it's all written up in [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md).

## Where things stand

This is very much a work in progress, and the pieces are at different stages:

- **Frontend** — a minimal React page: URL in, screenshot out. Works today against a backend running locally.
- **Backend** — a Go server that currently runs Chromium *locally* to serve requests. The AWS-calling code exists ([backend/fargate.go](backend/fargate.go)) but isn't wired into the request path yet.
- **Terraform** — infrastructure for three regions (UK, US, Germany) is written and validated, but has never been applied to a real AWS account. VPC, ECS cluster, ECR, IAM — the empty shell is there; the actual browser-testing container and task definition are still being built.

If you're poking around the code, don't be surprised to find scaffolding next to real working parts — that's exactly where this project is right now.

## Getting started

You'll need Go and Node installed. Nothing else is required to run this locally — no AWS account, no credentials, no Docker.

**Backend:**
```sh
cd backend
go run main.go
```
Runs on `http://localhost:8080`.

**Frontend:**
```sh
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` and talks to the backend above.

## Repo layout

```
backend/      Go server — the control plane
frontend/     React + Vite + Tailwind UI
terraform/    AWS infrastructure (VPC, ECS/Fargate, ECR, IAM), per region
```

## Contributing

If something here interests you, dig in — issues, PRs, questions, all welcome. A few things that'll make it easier to work together:

- **Keep it running.** If you touch the backend, `go run main.go` should still start cleanly; if you touch the frontend, `npm run dev` should still load.
- **Match the existing shape of things** rather than introducing a new pattern for something that already has one — this project is small enough that consistency matters more than personal style.
- **Run `go fmt` / `terraform fmt`** before committing Go or Terraform changes.
- **Terraform changes should stay `$0` while idle.** This project intentionally avoids things like NAT gateways and load balancers that bill just for existing. If a change you're proposing adds an always-on cost, say so up front in the PR so it can be discussed.
- **Small PRs over big ones.** Given how early-stage this is, a focused change that does one thing is much easier to review than a sweeping one.

No formal process beyond that — open an issue if you want to talk through an idea before writing code, or just open a PR if the change is obvious.
