# A 계정(mecross) bootstrap의 Terraform·provider 버전. infra/bootstrap과 같은 줄에 맞춘다
terraform {
  required_version = "~> 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  # bootstrap-a의 state도 로컬 파일이다(*.tfstate는 git 제외). A 계정에는 munjigi state 버킷이 없고 역할 하나뿐이라 S3 backend를 두지 않는다
}
