# A 계정 bootstrap 입력. 이름은 전부 project 하나에서 나온다
variable "region" {
  description = "A 계정에서 백엔드를 두는 리전. mecross 스택과 같다"
  type        = string
  default     = "ap-northeast-2"
}

variable "a_account_id" {
  description = "A 계정 ID. apply 전에 현재 자격 증명의 계정과 대조해 B 계정에 잘못 만드는 것을 막는다"
  type        = string
  default     = "478657622805"
}

variable "project" {
  description = "A 계정에서 munjigi 자원에 붙이는 프로젝트 이름. A에서는 munjigi라는 단어를 쓰지 않기로 해서 mecross 규칙(<project>-<역할>)에 맞춘 별도 이름이다"
  type        = string
  default     = "mecrosspro"
}

variable "b_terraform_role_arn" {
  description = "이 역할을 assume할 수 있는 B 계정의 Terraform 역할. GitHub Actions가 OIDC로 B 역할을 얻은 뒤 여기로 건너온다"
  type        = string
  default     = "arn:aws:iam::142024618409:role/munjigi-terraform"
}
