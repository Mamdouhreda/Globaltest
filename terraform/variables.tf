variable "project_name" {
  description = "Project name used for resource naming and tags."
  type        = string
  default     = "globaltest"
}

variable "environment" {
  description = "Environment name (e.g. dev, prod)."
  type        = string
  default     = "dev"
}

variable "regions" {
  description = "AWS region code for each GlobalTest testing location."
  type = object({
    uk      = string
    us      = string
    germany = string
  })
  default = {
    uk      = "eu-west-2"
    us      = "us-east-1"
    germany = "eu-central-1"
  }
}

variable "vpc_cidrs" {
  description = "VPC CIDR block for each region (kept distinct so they never overlap)."
  type = object({
    uk      = string
    us      = string
    germany = string
  })
  default = {
    uk      = "10.10.0.0/16"
    us      = "10.20.0.0/16"
    germany = "10.30.0.0/16"
  }
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default = {
    Project   = "globaltest"
    ManagedBy = "terraform"
  }
}
