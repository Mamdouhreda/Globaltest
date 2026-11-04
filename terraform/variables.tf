variable "project_name" {
  description = "Project name used for resource naming and tags."
  type        = string
  default     = "globaltest"
}

variable "rate_limit_per_ip" {
  description = "Tests one IP address may start per day. Each country in a run is one test."
  type        = number
  default     = 5
}

variable "rate_limit_per_range" {
  description = "Tests one network range (IPv4 /24, IPv6 /48) may start per day."
  type        = number
  default     = 20
}

variable "rate_limit_global" {
  description = "Tests everyone combined may start per day. This is what caps the bill."
  type        = number
  default     = 500
}

variable "turnstile_secret_key" {
  description = "Cloudflare Turnstile secret key. Set it in terraform.tfvars, which is gitignored. Left empty, the bot check is off."
  type        = string
  default     = ""
  sensitive   = true
}

variable "budget_alert_email" {
  description = "Where to send the daily AWS budget alert. Left empty, no budget is created."
  type        = string
  default     = ""
}

variable "daily_budget_usd" {
  description = "Daily AWS spend that triggers the budget alert."
  type        = string
  default     = "5"
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
    india     = string
    brazil    = string
  })
  default = {
    uk        = "eu-west-2"
    us        = "us-east-1"
    germany   = "eu-central-1"
    australia = "ap-southeast-2"
    ireland   = "eu-west-1"
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
    india     = string
    brazil    = string
  })
  default = {
    uk        = "10.10.0.0/16"
    us        = "10.20.0.0/16"
    germany   = "10.30.0.0/16"
    australia = "10.40.0.0/16"
    ireland   = "10.50.0.0/16"
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
