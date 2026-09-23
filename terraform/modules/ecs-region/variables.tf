variable "region_name" {
  description = "Short logical name for this region (e.g. uk, us, germany)."
  type        = string
}

variable "aws_region" {
  description = "AWS region code this module deploys into (e.g. eu-west-2)."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for this region's VPC."
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming and tags."
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev, prod)."
  type        = string
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default     = {}
}

variable "results_bucket_arn" {
  description = "ARN of the S3 bucket the browser-tester task writes screenshots/results into."
  type        = string
}

variable "browser_tester_image_tag" {
  description = "Git-SHA tag of the browser-tester image to run. Must already exist in this region's ECR repo before this can be applied."
  type        = string
}
