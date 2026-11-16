# infra/backend/providers.tf의 assume_role이 이 ARN을 쓴다. 이름이 정해져 있어 변수로 넘길 필요는 없고 확인용이다
output "terraform_role_arn" {
  value = aws_iam_role.terraform.arn
}
