terraform {
  required_version = "~> 1.15"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state on purpose: no S3/DynamoDB backend, so there's nothing
  # always-on to pay for while this stays a solo/hobby project. Revisit
  # once multiple people need to run `terraform apply`.
}
