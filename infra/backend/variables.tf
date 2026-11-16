# infra/backend 입력. A에 만드는 자원 이름은 전부 project(mecrosspro)에서 나오고, 빌려 쓰는 mecross 자원은 a 객체의 이름으로 찾는다
variable "region" {
  description = "A 계정에서 백엔드를 두는 리전. mecross 스택과 같다. B의 Route 53은 글로벌이라 리전이 무관하다"
  type        = string
  default     = "ap-northeast-2"
}

variable "project" {
  description = "A 계정에서 munjigi 자원에 붙이는 프로젝트 이름. A에서는 munjigi라는 단어를 쓰지 않기로 해서 mecross 규칙(<project>-<역할>)에 맞춘 별도 이름이다. infra/bootstrap-a의 project와 같은 값"
  type        = string
  default     = "mecrosspro"
}

variable "domain" {
  description = "Route 53 호스팅 존이 B에 있는 도메인. API는 api.<domain>, 프론트(APP_URL)는 www.<domain>. frontend와 달리 비울 수 없다(ALB host 규칙과 인증서에 이름이 필요하다)"
  type        = string
  default     = "munjigi.dev"

  validation {
    condition     = var.domain != ""
    error_message = "domain은 비울 수 없다. api.<domain>이 ALB host 규칙과 인증서 이름이 된다."
  }
}

variable "github_repo" {
  description = "배포 역할을 assume할 수 있는 GitHub 저장소. OIDC sub가 immutable subject 형식이라 이름 자리는 *로 두고 소유자 ID·저장소 ID에만 묶는다. bootstrap의 github_repo와 같은 값"
  type        = string
  default     = "*@20896639/*@1381437467"
}

variable "google_client_id" {
  description = "구글 OAuth 웹 클라이언트 ID. api가 부팅 때 getOrThrow로 요구해 비어 있으면 태스크가 죽는다. 비밀은 아니라 환경 변수로 넣는다. 워크플로가 저장소 변수 GOOGLE_CLIENT_ID를 TF_VAR_google_client_id로 넘긴다"
  type        = string

  validation {
    condition     = var.google_client_id != ""
    error_message = "google_client_id가 비어 있다. 저장소 변수 GOOGLE_CLIENT_ID를 등록한다."
  }
}

variable "a" {
  description = "빌려 쓰는 A 계정(mecross) 자원. ID 대신 이름으로 찾아, A에서 이름이 바뀌면 plan이 실패해 바로 드러난다(조용히 끊기지 않음). VPC는 ALB의 것을 쓴다"
  type = object({
    account_id      = string
    app_subnet_name = string
    app_sg_name     = string
    alb_name        = string
    cluster_name    = string
    valkey_id       = string
    rds_id          = string
  })
  default = {
    account_id      = "478657622805"
    app_subnet_name = "mecross-public-0"
    app_sg_name     = "mecross-app"
    alb_name        = "mecross-alb"
    cluster_name    = "mecross-cluster"
    valkey_id       = "mecross-valkey"
    rds_id          = "mecross-postgres"
  }
}

locals {
  api_host  = "api.${var.domain}"
  app_url   = "https://www.${var.domain}"
  mail_from = "no-reply@${var.domain}"
}
