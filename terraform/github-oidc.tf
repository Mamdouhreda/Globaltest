# ---------------------------------------------------------------------------
# GitHub Actions deploy access. The deploy workflow assumes this role via
# GitHub's OIDC provider — no long-lived AWS keys stored as repo secrets.
# Scoped to pushes on main of one repo, and to just what deploy.yml does:
# push images, register task-definition revisions, update the Lambda, sync
# the frontend bucket.
# ---------------------------------------------------------------------------

variable "github_repo" {
  description = "GitHub repository (owner/name) allowed to deploy."
  type        = string
  default     = "Mamdouhreda/Globaltest"
}

variable "github_oidc_subject_prefix" {
  description = "Prefix of the repo's OIDC sub claim. This repo uses immutable subjects (owner/repo IDs), see: gh api repos/OWNER/REPO/actions/oidc/customization/sub. Defaults to the standard repo:owner/name form when empty."
  type        = string
  default     = "repo:Mamdouhreda@114737066/Globaltest@1375109447"
}

variable "create_github_oidc_provider" {
  description = "Set false if this AWS account already has the token.actions.githubusercontent.com OIDC provider (only one is allowed per account)."
  type        = bool
  default     = true
}

resource "aws_iam_openid_connect_provider" "github" {
  count    = var.create_github_oidc_provider ? 1 : 0
  provider = aws.us

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github" {
  count    = var.create_github_oidc_provider ? 0 : 1
  provider = aws.us
  url      = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_provider_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

data "aws_iam_policy_document" "github_deploy_assume_role" {
  provider = aws.us

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${var.github_oidc_subject_prefix != "" ? var.github_oidc_subject_prefix : "repo:${var.github_repo}"}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  provider           = aws.us
  name               = "${var.project_name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_deploy_assume_role.json

  tags = var.tags
}

data "aws_iam_policy_document" "github_deploy" {
  provider = aws.us

  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [
      aws_ecr_repository.backend.arn,
      module.uk.ecr_repository_arn,
      module.us.ecr_repository_arn,
      module.germany.ecr_repository_arn,
    ]
  }

  # Neither action supports resource-level scoping.
  statement {
    actions   = ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"]
    resources = ["*"]
  }

  statement {
    actions = ["iam:PassRole"]
    resources = [
      module.uk.task_execution_role_arn,
      module.uk.task_role_arn,
      module.us.task_execution_role_arn,
      module.us.task_role_arn,
      module.germany.task_execution_role_arn,
      module.germany.task_role_arn,
    ]
  }

  statement {
    actions   = ["lambda:UpdateFunctionCode", "lambda:GetFunction", "lambda:GetFunctionConfiguration"]
    resources = [aws_lambda_function.backend.arn]
  }

  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.frontend.arn]
  }

  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  provider = aws.us
  name     = "${var.project_name}-github-deploy-permissions"
  role     = aws_iam_role.github_deploy.id
  policy   = data.aws_iam_policy_document.github_deploy.json
}

output "github_deploy_role_arn" {
  description = "Set this as the AWS_DEPLOY_ROLE_ARN repository variable/secret in GitHub."
  value       = aws_iam_role.github_deploy.arn
}
