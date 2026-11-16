# apply 뒤 아래 둘을 저장소 variables에 넣는다: BACKEND_DEPLOY_ROLE_ARN(deploy_role_arn), MIGRATE_NETWORK_CONFIG(migrate_network_config)
output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "api_host" {
  value = local.api_host
}

# deploy-backend.yml이 run-task --network-configuration에 그대로 넣는 값. 서비스와 같은 서브넷·SG
output "migrate_network_config" {
  value = "awsvpcConfiguration={subnets=[${data.aws_subnet.app.id}],securityGroups=[${data.aws_security_group.app.id}],assignPublicIp=ENABLED}"
}

# A bastion에서 psql로 한 번 실행한다. 비밀번호는 aws ssm get-parameter --name /<project>/prod/DATABASE_URL --with-decryption 값의 것
output "db_role_sql" {
  value = "CREATE ROLE ${var.project} LOGIN PASSWORD '<SSM /${var.project}/prod/DATABASE_URL의 비밀번호>'; CREATE DATABASE ${var.project} OWNER ${var.project};"
}
