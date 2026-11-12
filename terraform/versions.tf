terraform {
  required_version = "~> 1.15"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State lives in S3 so any machine with AWS credentials can run plan/apply
  # against the same state. The bucket was created by hand (it can't manage
  # itself): versioned, private, TLS-only. use_lockfile keeps a lock object
  # next to the state, so no DynamoDB table is needed. Costs well under $0.01
  # a month.
  backend "s3" {
    bucket       = "globaltest-tfstate-632248361014"
    key          = "globaltest/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
