# ---------------------------------------------------------------------------
# Values that used to live in the gitignored terraform.tfvars, now kept in
# SSM Parameter Store (standard tier: free) so a fresh clone on any machine
# can plan/apply with nothing but AWS credentials.
#
# Created by hand, not by Terraform, so the secret never has to appear in
# this repo:
#   aws ssm put-parameter --region us-east-1 --type SecureString \
#     --name /globaltest/turnstile-secret-key --value '<secret>'
#
# The two image tags are written by .github/workflows/deploy.yml after each
# successful deploy. Terraform ignores image changes on the Lambda and task
# definitions (CI owns which image runs), so these only matter when one of
# those resources is created or replaced: it then starts on the image that
# is actually live, not a stale one.
# ---------------------------------------------------------------------------

data "aws_ssm_parameter" "turnstile_secret_key" {
  provider = aws.us
  name     = "/${var.project_name}/turnstile-secret-key"
}

data "aws_ssm_parameter" "backend_image_tag" {
  provider = aws.us
  name     = "/${var.project_name}/backend-image-tag"
}

data "aws_ssm_parameter" "browser_tester_image_tag" {
  provider = aws.us
  name     = "/${var.project_name}/browser-tester-image-tag"
}

locals {
  backend_image_tag        = nonsensitive(data.aws_ssm_parameter.backend_image_tag.value)
  browser_tester_image_tag = nonsensitive(data.aws_ssm_parameter.browser_tester_image_tag.value)
}
