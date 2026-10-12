output "uk" {
  description = "UK region infrastructure outputs."
  value = {
    cluster_name        = module.uk.cluster_name
    cluster_arn         = module.uk.cluster_arn
    vpc_id              = module.uk.vpc_id
    public_subnet_ids   = module.uk.public_subnet_ids
    security_group_id   = module.uk.security_group_id
    ecr_repository_url  = module.uk.ecr_repository_url
    task_execution_role = module.uk.task_execution_role_arn
    task_role           = module.uk.task_role_arn
  }
}

output "us" {
  description = "US region infrastructure outputs."
  value = {
    cluster_name        = module.us.cluster_name
    cluster_arn         = module.us.cluster_arn
    vpc_id              = module.us.vpc_id
    public_subnet_ids   = module.us.public_subnet_ids
    security_group_id   = module.us.security_group_id
    ecr_repository_url  = module.us.ecr_repository_url
    task_execution_role = module.us.task_execution_role_arn
    task_role           = module.us.task_role_arn
  }
}

output "germany" {
  description = "Germany region infrastructure outputs."
  value = {
    cluster_name        = module.germany.cluster_name
    cluster_arn         = module.germany.cluster_arn
    vpc_id              = module.germany.vpc_id
    public_subnet_ids   = module.germany.public_subnet_ids
    security_group_id   = module.germany.security_group_id
    ecr_repository_url  = module.germany.ecr_repository_url
    task_execution_role = module.germany.task_execution_role_arn
    task_role           = module.germany.task_role_arn
  }
}

output "australia" {
  description = "Australia region infrastructure outputs."
  value = {
    cluster_name        = module.australia.cluster_name
    cluster_arn         = module.australia.cluster_arn
    vpc_id              = module.australia.vpc_id
    public_subnet_ids   = module.australia.public_subnet_ids
    security_group_id   = module.australia.security_group_id
    ecr_repository_url  = module.australia.ecr_repository_url
    task_execution_role = module.australia.task_execution_role_arn
    task_role           = module.australia.task_role_arn
  }
}

output "ireland" {
  description = "Ireland region infrastructure outputs."
  value = {
    cluster_name        = module.ireland.cluster_name
    cluster_arn         = module.ireland.cluster_arn
    vpc_id              = module.ireland.vpc_id
    public_subnet_ids   = module.ireland.public_subnet_ids
    security_group_id   = module.ireland.security_group_id
    ecr_repository_url  = module.ireland.ecr_repository_url
    task_execution_role = module.ireland.task_execution_role_arn
    task_role           = module.ireland.task_role_arn
  }
}

output "india" {
  description = "India region infrastructure outputs."
  value = {
    cluster_name        = module.india.cluster_name
    cluster_arn         = module.india.cluster_arn
    vpc_id              = module.india.vpc_id
    public_subnet_ids   = module.india.public_subnet_ids
    security_group_id   = module.india.security_group_id
    ecr_repository_url  = module.india.ecr_repository_url
    task_execution_role = module.india.task_execution_role_arn
    task_role           = module.india.task_role_arn
  }
}

output "brazil" {
  description = "Brazil region infrastructure outputs."
  value = {
    cluster_name        = module.brazil.cluster_name
    cluster_arn         = module.brazil.cluster_arn
    vpc_id              = module.brazil.vpc_id
    public_subnet_ids   = module.brazil.public_subnet_ids
    security_group_id   = module.brazil.security_group_id
    ecr_repository_url  = module.brazil.ecr_repository_url
    task_execution_role = module.brazil.task_execution_role_arn
    task_role           = module.brazil.task_role_arn
  }
}

output "backend" {
  description = "Backend control-plane (Lambda) infrastructure outputs."
  value = {
    ecr_repository_url = aws_ecr_repository.backend.repository_url
    lambda_role        = aws_iam_role.backend_lambda.arn
    invoke_url         = aws_apigatewayv2_stage.backend.invoke_url
  }
}

output "frontend" {
  description = "Frontend (S3 static website) infrastructure outputs."
  value = {
    bucket_name = aws_s3_bucket.frontend.id
    website_url = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
  }
}
