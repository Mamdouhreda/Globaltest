# Reusable per-region infrastructure for a GlobalTest browser-testing region.
#
# Deliberately $0 while idle:
# - No NAT Gateway: tasks run in public subnets with a public IP instead, since
#   they only need outbound internet access to reach arbitrary test websites.
# - No load balancer: the control-plane backend starts tasks directly via the
#   ECS RunTask API.
# - Empty ECS cluster + unused ECR repo + IAM roles cost nothing on their own;
#   AWS only bills running Fargate tasks and stored images/logs.

locals {
  name_prefix = "${var.project_name}-${var.region_name}"
}

# Looked up (not hardcoded) so the module works in any region without
# needing to know its AZ names in advance.
data "aws_availability_zones" "available" {
  state = "available"
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------

# Isolated network per region so each region's Fargate tasks, and any future
# resources, don't share address space or a blast radius with the others.
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

# Gives the VPC a path to/from the public internet. Required since there's
# no NAT Gateway here — this is the only route out.
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-igw"
  })
}

# Public (not private) on purpose: this is what lets tasks get a public IP
# and reach the internet directly, avoiding a NAT Gateway. Two subnets in
# two AZs so a Fargate task can still land somewhere if one AZ has no
# capacity — not for high availability of a long-running service.
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-public-${count.index}"
  })
}

# Sends all outbound traffic (0.0.0.0/0) straight to the internet gateway —
# the NAT-Gateway-free equivalent of a "public subnet" route table.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-public-rt"
  })
}

# Attaches the route table above to both subnets.
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# No ingress rules at all: tasks are never called into from outside, only
# call out, so there's nothing to open inbound.
resource "aws_security_group" "fargate_tasks" {
  name        = "${local.name_prefix}-fargate-tasks"
  description = "GlobalTest Fargate browser-testing tasks: no inbound, all outbound"
  vpc_id      = aws_vpc.this.id

  egress {
    description = "Allow all outbound (tasks must reach arbitrary test websites)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-fargate-tasks"
  })
}

# ---------------------------------------------------------------------------
# ECS (empty cluster — no capacity reserved, no running tasks)
# ---------------------------------------------------------------------------

# The orchestrator Fargate tasks register into. Costs nothing by itself —
# Container Insights is off since it bills for the extra metrics it collects.
resource "aws_ecs_cluster" "this" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# ECR (empty repo until a browser-testing image is pushed in a later phase)
# ---------------------------------------------------------------------------

# Regional so each Fargate task pulls its image from a repo in the same
# region rather than crossing regions. Scan-on-push is off to keep this
# free-tier friendly; turn it on once the image pipeline is real.
resource "aws_ecr_repository" "browser_tester" {
  name                 = "${local.name_prefix}-browser-tester"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# IAM
# ---------------------------------------------------------------------------

# Trust policy shared by both IAM roles below: only the ECS service itself
# is allowed to assume them.
data "aws_iam_policy_document" "ecs_tasks_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Used by the ECS agent itself: pull the image from ECR, write logs.
resource "aws_iam_role" "task_execution" {
  name               = "${local.name_prefix}-task-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Used by application code inside the running task (e.g. writing screenshots
# to S3). No policies attached yet — permissions are added in Phase 5 once
# the container actually writes to S3.
resource "aws_iam_role" "task" {
  name               = "${local.name_prefix}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json

  tags = var.tags
}
