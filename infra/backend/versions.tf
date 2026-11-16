# infra/backend의 Terraform·provider 버전과 state 위치. infra/frontend와 같은 줄에 맞춘다
terraform {
  required_version = "~> 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    # DB 비밀번호·JWT 시크릿·암호화 키 생성(random_bytes는 3.6부터)
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # state는 B 계정의 munjigi state 버킷에 둔다(frontend와 같은 버킷, 키만 다름). 자원은 A에 만들지만
  # 워크플로의 자격 증명이 B라 state도 B가 자연스럽다. 버킷 이름은 init 때 넘긴다: terraform init -backend-config="bucket=<TFSTATE_BUCKET>"
  backend "s3" {
    key          = "backend/terraform.tfstate"
    region       = "ap-northeast-2"
    use_lockfile = true
  }
}
