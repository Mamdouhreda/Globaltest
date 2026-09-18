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
# Backend container (control plane). Unlike the browser-tester, this is a
# single control-plane service, not one per region, so it lives directly
# here rather than inside the ecs-region module — created once, in us-east-1.
# ---------------------------------------------------------------------------

resource "aws_ecr_repository" "backend" {
  provider             = aws.us
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = false
  }

  tags = var.tags
}

# Trust policy for the backend's own IAM roles: only ECS is allowed to
# assume them, same pattern as each region's browser-tester roles.
data "aws_iam_policy_document" "backend_assume_role" {
  provider = aws.us

  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Used by the ECS agent to pull the backend image from ECR and write logs —
# same role shape as each region's task-execution role.
resource "aws_iam_role" "backend_task_execution" {
  provider           = aws.us
  name               = "${var.project_name}-backend-task-execution"
  assume_role_policy = data.aws_iam_policy_document.backend_assume_role.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backend_task_execution" {
  provider   = aws.us
  role       = aws_iam_role.backend_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Assumed by the backend application code itself while running in Fargate.
# This is what lets backend/fargate.go's RunTask call actually succeed once
# the backend is containerized — it needs permission to launch
# browser-tester tasks in every region and to hand ECS those tasks' roles.
resource "aws_iam_role" "backend_task" {
  provider           = aws.us
  name               = "${var.project_name}-backend-task"
  assume_role_policy = data.aws_iam_policy_document.backend_assume_role.json

  tags = var.tags
}

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

resource "aws_iam_role_policy" "backend_task" {
  provider = aws.us
  name     = "${var.project_name}-backend-task-permissions"
  role     = aws_iam_role.backend_task.id
  policy   = data.aws_iam_policy_document.backend_task_permissions.json
}
