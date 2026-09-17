# GlobalTest Terraform

Infrastructure-as-code for GlobalTest's AWS ECS/Fargate browser-testing backend. See [../PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md) for the overall architecture.

This is **Phase 1 — infrastructure only**: VPC, ECS cluster, ECR repo, IAM roles, and security group, per region (UK, US, Germany). There is no ECS task definition yet and no code that launches a Fargate task — that comes once the Go + Chromium container image exists (Phase 2 onward). There's also no S3 bucket yet — one will be added later, likely for hosting frontend static files rather than screenshots.

## Why this costs $0 while idle

- **No NAT Gateway.** Fargate tasks launch into public subnets with a public IP instead of a private subnet behind a NAT Gateway (~$32/month + data even when unused). Tasks only need outbound access to reach arbitrary test websites, so this is enough — the security group has no inbound rules.
- **No load balancer.** The Go backend will start tasks directly via the ECS `RunTask` API, not behind an ALB.
- **Empty ECS clusters, IAM roles, and ECR repos are free.** AWS only bills running Fargate tasks and stored data (e.g. images) — not the presence of these resources.
- **Local Terraform state** — no S3/DynamoDB backend, so there's nothing always-on billed just to track state.

Once tasks actually run, real costs are Fargate compute (billed per second while a task runs), plus small storage costs for any ECR images. Nothing here runs continuously.

## Structure

```
terraform/
├── versions.tf              # Terraform + AWS provider version constraints
├── providers.tf              # aws.uk / aws.us / aws.germany provider aliases
├── variables.tf               # project-wide variables (regions, CIDRs, tags)
├── main.tf                    # instantiates the ecs-region module per region
├── outputs.tf                 # per-region outputs (cluster, ECR, IAM, etc.)
├── terraform.tfvars.example   # copy to terraform.tfvars to override defaults
└── modules/
    └── ecs-region/            # reusable per-region module (VPC, ECS, ECR, IAM, logs)
```

Adding a new testing region later means adding one more `module "..." { source = "./modules/ecs-region" ... }` block in `main.tf` — no duplication of the underlying resources.

## Usage

```sh
cd terraform
terraform fmt -recursive   # format check, offline
terraform init              # downloads the AWS provider plugin, offline/free
terraform validate          # checks config validity, does not touch AWS
```

**Do not run `terraform plan` or `terraform apply` without first:**
1. Configuring AWS credentials (`aws configure` or SSO) — not set up yet in this environment.
2. Reviewing the plan output and understanding what it will actually create and what it will cost.

Nothing in this repo has been applied to a real AWS account yet.
