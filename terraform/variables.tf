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
    uk        = string
    us        = string
    germany   = string
    australia = string
    ireland   = string
    uae       = string
    india     = string
    brazil    = string
  })
  default = {
    uk        = "eu-west-2"
    us        = "us-east-1"
    germany   = "eu-central-1"
    australia = "ap-southeast-2"
    ireland   = "eu-west-1"
    uae       = "me-central-1" # opt-in region: enable it in the AWS account first
    india     = "ap-south-1"
    brazil    = "sa-east-1"
  }
}

variable "vpc_cidrs" {
  description = "VPC CIDR block for each region (kept distinct so they never overlap)."
  type = object({
    uk        = string
    us        = string
    germany   = string
    australia = string
    ireland   = string
    uae       = string
    india     = string
    brazil    = string
  })
  default = {
    uk        = "10.10.0.0/16"
    us        = "10.20.0.0/16"
    germany   = "10.30.0.0/16"
    australia = "10.40.0.0/16"
    ireland   = "10.50.0.0/16"
    uae       = "10.60.0.0/16"
    india     = "10.70.0.0/16"
    brazil    = "10.80.0.0/16"
  }
}

variable "backend_image_tag" {
  description = "Git-SHA tag of the backend image to deploy to Lambda. A mutable tag like \"latest\" wouldn't trigger a Terraform diff on redeploy — Lambda would silently keep serving the old image. Must reference an image that already exists in the backend ECR repo before this can be applied."
  type        = string
  default     = "latest" # placeholder — set to a real pushed image tag before applying the Lambda resources
}

variable "browser_tester_image_tag" {
  description = "Git-SHA tag of the browser-tester image to deploy to each region's ECS task definition. Must already exist in all regional ECR repos before this can be applied."
  type        = string
  default     = "latest" # placeholder — set to a real pushed image tag before applying the ECS task definitions
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default = {
    Project   = "globaltest"
    ManagedBy = "terraform"
  }
}
