output "cluster_name" {
  description = "Name of the ECS cluster in this region."
  value       = aws_ecs_cluster.this.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster in this region."
  value       = aws_ecs_cluster.this.arn
}

output "vpc_id" {
  description = "ID of the VPC in this region."
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets Fargate tasks should launch into."
  value       = aws_subnet.public[*].id
}

output "security_group_id" {
  description = "ID of the security group Fargate tasks should use."
  value       = aws_security_group.fargate_tasks.id
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for the browser-testing image."
  value       = aws_ecr_repository.browser_tester.repository_url
}

output "task_execution_role_arn" {
  description = "ARN of the IAM role used by the ECS agent to pull images and write logs."
  value       = aws_iam_role.task_execution.arn
}

output "task_role_arn" {
  description = "ARN of the IAM role assumed by application code inside the running task."
  value       = aws_iam_role.task.arn
}

output "task_definition_arn" {
  description = "ARN of the browser-tester ECS task definition, for RunTask to launch."
  value       = aws_ecs_task_definition.browser_tester.arn
}

output "task_definition_family" {
  description = "Family of the browser-tester task definition. RunTask given a bare family runs its latest ACTIVE revision, so CI can register new revisions without updating the backend."
  value       = aws_ecs_task_definition.browser_tester.family
}

output "ecr_repository_arn" {
  description = "ARN of the browser-tester ECR repository."
  value       = aws_ecr_repository.browser_tester.arn
}
