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
