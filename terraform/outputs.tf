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
