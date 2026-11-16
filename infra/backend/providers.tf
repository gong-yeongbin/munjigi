# 기본 provider는 A 계정(mecross, 478657622805). 워크플로의 OIDC 자격은 B 역할(munjigi-terraform)이고,
# 그 역할이 infra/bootstrap-a가 만든 A의 mecrosspro-terraform을 assume해 A 자원을 만든다.
# B에 남는 것(Route 53 레코드)만 alias b를 쓴다
provider "aws" {
  region = var.region

  assume_role {
    role_arn = "arn:aws:iam::${var.a.account_id}:role/${var.project}-terraform"
  }

  # mecross 스택의 태그 규칙. A 콘솔에서 Project 태그로 mecross와 구분한다
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}

# B 계정(munjigi.dev 호스팅 존). 워크플로 자격 증명 그대로
provider "aws" {
  alias  = "b"
  region = var.region
}

data "aws_caller_identity" "a" {}

locals {
  a_account_id = data.aws_caller_identity.a.account_id
}
