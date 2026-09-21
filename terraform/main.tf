# ---------------------------------------------------------------------------
# One region = one instantiation of the ecs-region module. Adding a new
# testing region later (e.g. Japan) means adding another block like these
# three, not copying the underlying VPC/ECS/ECR/IAM resources.
# ---------------------------------------------------------------------------

module "uk" {
  source = "./modules/ecs-region"
  providers = {
    aws = aws.uk
  }

  region_name  = "uk"
  aws_region   = var.regions.uk
  vpc_cidr     = var.vpc_cidrs.uk
  project_name = var.project_name
  environment  = var.environment
  tags         = var.tags
}

module "us" {
  source = "./modules/ecs-region"
  providers = {
    aws = aws.us
  }

  region_name  = "us"
  aws_region   = var.regions.us
  vpc_cidr     = var.vpc_cidrs.us
  project_name = var.project_name
  environment  = var.environment
  tags         = var.tags
}

module "germany" {
  source = "./modules/ecs-region"
  providers = {
    aws = aws.germany
  }

  region_name  = "germany"
  aws_region   = var.regions.germany
  vpc_cidr     = var.vpc_cidrs.germany
  project_name = var.project_name
  environment  = var.environment
  tags         = var.tags
}

# ---------------------------------------------------------------------------
# Backend (control plane). Runs as a Lambda function packaged as a container
# image, behind an API Gateway HTTP API — not ECS/Fargate. An always-on
# Fargate service would cost ~$12.66/month just sitting idle (smallest task
# size + the mandatory public-IP charge, since there's no load balancer);
# Lambda actually scales to zero, matching the $0-idle design used
# everywhere else in this project. Single control-plane instance, not one
# per region, so it lives directly here rather than inside the ecs-region
# module — created once, in us-east-1.
# ---------------------------------------------------------------------------

data "aws_caller_identity" "current" {
  provider = aws.us
}

resource "aws_ecr_repository" "backend" {
  provider             = aws.us
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = false
  }

  tags = var.tags
}

# Explicitly grants Lambda pull access to the backend image, scoped to this
# specific function. AWS's console/control-plane can auto-add an equivalent
# policy at function-create time for admin-level callers, but leaving that
# implicit means it's undeclared in Terraform state — so it's declared here
# instead.
resource "aws_ecr_repository_policy" "backend" {
  provider   = aws.us
  repository = aws_ecr_repository.backend.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "LambdaECRImageRetrievalPolicy"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
      Condition = {
        StringEquals = {
          "aws:sourceArn" = "arn:aws:lambda:${var.regions.us}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-backend"
        }
      }
    }]
  })
}

# Trust policy for the backend's Lambda execution role: only the Lambda
# service is allowed to assume it.
data "aws_iam_policy_document" "backend_assume_role" {
  provider = aws.us

  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# Lambda has one execution role, not ECS's split "task execution" (pull
# image, write logs) vs "task" (app permissions) — both collapse into this
# single role.
resource "aws_iam_role" "backend_lambda" {
  provider           = aws.us
  name               = "${var.project_name}-backend-lambda"
  assume_role_policy = data.aws_iam_policy_document.backend_assume_role.json

  tags = var.tags
}

# AWS-managed logging permissions — the Lambda equivalent of ECS's
# AmazonECSTaskExecutionRolePolicy attachment.
resource "aws_iam_role_policy_attachment" "backend_lambda_basic" {
  provider   = aws.us
  role       = aws_iam_role.backend_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Same application-level permissions the backend has always needed to
# actually trigger browser-tester tasks — unchanged logic, just now on a
# single Lambda role instead of split across two ECS-style roles.
data "aws_iam_policy_document" "backend_task_permissions" {
  provider = aws.us

  # Launch a browser-tester task in any of the three regions. Scoped by
  # family name rather than a specific revision ARN, since the task
  # definitions themselves don't exist yet (added in a later phase).
  statement {
    actions = ["ecs:RunTask"]
    resources = [
      "arn:aws:ecs:${var.regions.uk}:*:task-definition/${var.project_name}-uk-browser-tester:*",
      "arn:aws:ecs:${var.regions.us}:*:task-definition/${var.project_name}-us-browser-tester:*",
      "arn:aws:ecs:${var.regions.germany}:*:task-definition/${var.project_name}-germany-browser-tester:*",
    ]
  }

  # ECS does not support resource-level scoping for DescribeTasks/StopTask
  # by cluster or task-definition ARN, so this is necessarily "*" — it only
  # grants visibility into task status, not the ability to launch anything.
  statement {
    actions   = ["ecs:DescribeTasks", "ecs:StopTask"]
    resources = ["*"]
  }

  # RunTask requires the caller to be allowed to hand ECS the execution/task
  # roles named in the task definition — without this, RunTask fails even
  # with ecs:RunTask granted above.
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
}

resource "aws_iam_role_policy" "backend_lambda" {
  provider = aws.us
  name     = "${var.project_name}-backend-lambda-permissions"
  role     = aws_iam_role.backend_lambda.id
  policy   = data.aws_iam_policy_document.backend_task_permissions.json
}

# The function itself. package_type = "Image" requires image_uri to already
# resolve to a real digest in ECR at apply time — unlike an ECS task
# definition, this can't reference a not-yet-pushed tag. Small/short-lived
# on purpose: this just calls one AWS API (ecs:RunTask) and returns.
resource "aws_lambda_function" "backend" {
  provider      = aws.us
  function_name = "${var.project_name}-backend"
  role          = aws_iam_role.backend_lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
  timeout       = 10
  memory_size   = 128
  architectures = ["arm64"]

  depends_on = [
    aws_ecr_repository_policy.backend,
    aws_iam_role_policy_attachment.backend_lambda_basic,
    aws_iam_role_policy.backend_lambda,
  ]

  tags = var.tags
}

# HTTP API, not REST API — cheaper ($1/million requests vs $3.50/million)
# and all this needs is a single proxy route.
resource "aws_apigatewayv2_api" "backend" {
  provider      = aws.us
  name          = "${var.project_name}-backend"
  protocol_type = "HTTP"

  tags = var.tags
}

resource "aws_apigatewayv2_integration" "backend" {
  provider               = aws.us
  api_id                 = aws_apigatewayv2_api.backend.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

# A single catch-all route: the Go http.ServeMux inside the Lambda already
# does the real routing (POST /url vs /), so there's no need to duplicate
# that as separate API Gateway routes.
resource "aws_apigatewayv2_route" "backend" {
  provider  = aws.us
  api_id    = aws_apigatewayv2_api.backend.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_apigatewayv2_stage" "backend" {
  provider    = aws.us
  api_id      = aws_apigatewayv2_api.backend.id
  name        = "$default"
  auto_deploy = true

  tags = var.tags
}

resource "aws_lambda_permission" "backend_apigw" {
  provider      = aws.us
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.backend.execution_arn}/*/*"
}
