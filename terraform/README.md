# GlobalTest Terraform

Infrastructure-as-code for GlobalTest's AWS ECS/Fargate browser-testing backend. See [../PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md) for the overall architecture.

This is **Phase 1 — infrastructure only**: VPC, ECS cluster, ECR repo, IAM roles, and security group, per region (UK, US, Germany, Australia, Ireland, India, Brazil). There is no ECS task definition yet and no code that launches a Fargate task — that comes once the Go + Chromium container image exists (Phase 2 onward). There's also no S3 bucket yet — one will be added later, likely for hosting frontend static files rather than screenshots.

## Why this costs $0 while idle

- **No NAT Gateway.** Fargate tasks launch into public subnets with a public IP instead of a private subnet behind a NAT Gateway (~$32/month + data even when unused). Tasks only need outbound access to reach arbitrary test websites, so this is enough — the security group has no inbound rules.
- **No load balancer.** The Go backend will start tasks directly via the ECS `RunTask` API, not behind an ALB.
- **Empty ECS clusters, IAM roles, and ECR repos are free.** AWS only bills running Fargate tasks and stored data (e.g. images) — not the presence of these resources.
- **State in a small S3 bucket**, locked with an S3 lock file rather than a DynamoDB table — well under $0.01/month.

Once tasks actually run, real costs are Fargate compute (billed per second while a task runs), plus small storage costs for any ECR images. Nothing here runs continuously.

## Rate limits

Starting a test is limited per IP, per network range and globally per day, using counters in the on-demand `globaltest-rate-limits` DynamoDB table (see `backend/ratelimit.go`). Change the limits with the `rate_limit_*` variables in `terraform.tfvars`; `terraform apply` is all it takes.

The Cloudflare Turnstile bot check needs both keys: the public site key in `frontend/.env.production`, and the secret in the SSM parameter `/globaltest/turnstile-secret-key` (see `ssm.tf`). Deploy the frontend first, then change the secret and `terraform apply`, or tests will be refused in between.

## Structure

```
terraform/
├── versions.tf              # Terraform + AWS provider version constraints
├── providers.tf              # one aws.<region> provider alias per testing region
├── variables.tf               # project-wide variables (regions, CIDRs, tags)
├── main.tf                    # instantiates the ecs-region module per region
├── outputs.tf                 # per-region outputs (cluster, ECR, IAM, etc.)
├── terraform.tfvars.example   # copy to terraform.tfvars to override defaults
└── modules/
    └── ecs-region/            # reusable per-region module (VPC, ECS, ECR, IAM, logs)
```

Adding a new testing region later means adding one more `module "..." { source = "./modules/ecs-region" ... }` block in `main.tf` — no duplication of the underlying resources.

A new region also needs an entry in `variables.tf` (`regions` and `vpc_cidrs`), a provider alias in `providers.tf`, the backend Lambda's `FARGATE_<REGION>_*` variables and IAM statements in `main.tf`, the deploy role in `github-oidc.tf`, the `browser-tester` matrix in `.github/workflows/deploy.yml`, `testingRegions` in `backend/fargate.go` and `REGIONS` in `frontend/src/main.tsx`.

## Opt-in regions

Regions launched after March 2019 (e.g. UAE `me-central-1`) are disabled in new AWS accounts, and `terraform plan` fails until the region is enabled with `aws account enable-region --region-name <region>`.

UAE was tried and dropped: AWS reported availability zone `mec1-az2` as unavailable, and the region's subnet and ECS cluster creation never completed.

## State and shared values

Nothing Terraform needs lives only on one machine, so you can work from any computer with AWS credentials for account `632248361014`:

- **State** is in the S3 bucket `globaltest-tfstate-632248361014` (us-east-1), set in `versions.tf`. It's versioned, so older states can be restored, private, and TLS-only. `use_lockfile` stops two applies from running at once. The bucket was created by hand because it can't manage itself.
- **The Turnstile secret** is the SecureString SSM parameter `/globaltest/turnstile-secret-key`.
- **Image tags** are in `/globaltest/backend-image-tag` and `/globaltest/browser-tester-image-tag`. `deploy.yml` writes them after each deploy. Terraform ignores image changes on existing resources (CI owns which image runs), so these only matter when a Lambda or task definition is created or replaced.

`terraform.tfvars` is optional and only for overriding the defaults in `variables.tf`.

## Usage

```sh
git pull                    # always start from the latest code
cd terraform
aws sts get-caller-identity # make sure you're logged in to the right account
terraform init              # first time on a machine; connects to the S3 state
terraform plan              # review before every apply
terraform apply
```

Run `terraform fmt -recursive` before committing.
