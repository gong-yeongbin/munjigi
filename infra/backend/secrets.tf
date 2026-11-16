# 운영 시크릿. Terraform이 만들어 SSM SecureString에 넣고 ECS가 태스크 시작 때 주입한다(mecross와 같은 방식).
# 값은 state(B 버킷, 암호화·비공개)에도 남는다. 사람이 값을 볼 일은 bastion에서 DB role을 만들 때 한 번뿐
resource "random_password" "db" {
  length  = 32
  special = false # URL에 그대로 들어가야 해서 영숫자만
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

# 서명 시크릿·목적지 헤더를 AES-256-GCM으로 감싸는 키(base64 32바이트). 바꾸면 저장된 암호문을 전부 못 읽어 destroy를 막는다.
# B로 이관할 때도 새로 만들지 않고 이 값을 복사한다(context-notes "백엔드 배포" 절)
resource "random_bytes" "encryption_key" {
  length = 32

  lifecycle {
    prevent_destroy = true
  }
}

# role·database는 Terraform이 못 만든다(RDS가 비공개 서브넷). outputs의 db_role_sql을 A bastion에서 한 번 실행한다.
# sslmode=no-verify: RDS Postgres 17은 SSL을 강제하고 pg 8.x의 require는 RDS CA를 검증해 실패한다. mecross와 같은 선택
resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project}/prod/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://${var.project}:${random_password.db.result}@${data.aws_db_instance.postgres.address}:${data.aws_db_instance.postgres.port}/${var.project}?sslmode=no-verify"
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${var.project}/prod/JWT_SECRET"
  type  = "SecureString"
  value = random_password.jwt.result
}

resource "aws_ssm_parameter" "encryption_key" {
  name  = "/${var.project}/prod/ENCRYPTION_KEY"
  type  = "SecureString"
  value = random_bytes.encryption_key.base64
}

locals {
  # 컨테이너 secrets(name → SSM ARN). execution 역할의 ssm:GetParameters 범위도 이 셋이다
  secret_arns = {
    DATABASE_URL   = aws_ssm_parameter.database_url.arn
    JWT_SECRET     = aws_ssm_parameter.jwt_secret.arn
    ENCRYPTION_KEY = aws_ssm_parameter.encryption_key.arn
  }
}
