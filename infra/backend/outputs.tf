# apply 뒤 deploy_role_arn을 저장소 variable BACKEND_DEPLOY_ROLE_ARN에 넣는다. 마이그레이션 태스크의 네트워크 설정은 deploy-backend.yml이 서비스에서 읽는다
output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "api_host" {
  value = local.api_host
}

# A bastion에서 psql로 한 번 실행한다. 비밀번호는 aws ssm get-parameter --name /<project>/prod/DATABASE_URL --with-decryption 값의 것
output "db_role_sql" {
  value = "CREATE ROLE ${var.project} LOGIN PASSWORD '<SSM /${var.project}/prod/DATABASE_URL의 비밀번호>'; CREATE DATABASE ${var.project} OWNER ${var.project};"
}
