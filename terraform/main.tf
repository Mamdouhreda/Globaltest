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
