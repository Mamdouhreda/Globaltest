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

provider "aws" {
  alias  = "australia"
  region = var.regions.australia
}

provider "aws" {
  alias  = "ireland"
  region = var.regions.ireland
}

provider "aws" {
  alias  = "uae"
  region = var.regions.uae
}

provider "aws" {
  alias  = "india"
  region = var.regions.india
}

provider "aws" {
  alias  = "brazil"
  region = var.regions.brazil
}
