provider "aws" {
  alias  = "uk"
  region = var.regions.uk
}

provider "aws" {
  alias  = "us"
  region = var.regions.us
}

provider "aws" {
  alias  = "germany"
  region = var.regions.germany
}
