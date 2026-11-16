# A 계정(mecross, 478657622805)에서 딱 한 번, 로컬에서 apply한다. 이후 infra/backend는 GitHub Actions가
# B 계정 역할(munjigi-terraform)로 들어와 여기서 만든 역할을 assume해 A 자원을 만든다.
#   cd infra/bootstrap-a && AWS_PROFILE=<A 관리자> terraform init && terraform apply
# A에서는 munjigi 대신 mecrosspro라는 이름을 쓴다(variables.tf의 project).

provider "aws" {
  region = var.region
  # mecross 스택의 규칙. A 콘솔에서 Project 태그로 구분한다
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

# GitHub OIDC 공급자는 A에 이미 있다(mecross가 만듦). 계정당 URL 하나라 만들지 않고 찾는다
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  account_id = data.aws_caller_identity.current.account_id
}

# ── infra/backend가 쓰는 Terraform 역할 ────────────────────────────────────────

# B 계정의 Terraform 역할만 들어올 수 있다. OIDC 조건은 B 쪽 trust가 이미 검사했다
data "aws_iam_policy_document" "terraform_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = [var.b_terraform_role_arn]
    }
  }
}

resource "aws_iam_role" "terraform" {
  name               = "${var.project}-terraform"
  assume_role_policy = data.aws_iam_policy_document.terraform_trust.json

  # A 관리자 프로필 대신 B 프로필로 실수로 apply하면 B에 역할이 생긴다. 계정이 다르면 plan에서 멈춘다
  lifecycle {
    precondition {
      condition     = local.account_id == var.a_account_id
      error_message = "현재 자격 증명의 계정(${local.account_id})이 A 계정(${var.a_account_id})이 아니다. AWS_PROFILE을 확인한다."
    }
  }
}

# A에서 만들고 읽는 것만. mecross 자원은 이름으로 찾아 읽기만 하고(Describe), 새로 만드는 건 project 접두사 안에 가둔다
data "aws_iam_policy_document" "terraform" {
  # 빌려 쓰는 mecross 자원 조회: VPC·서브넷·보안 그룹, 클러스터, ALB·리스너, Valkey 엔드포인트, RDS 주소
  statement {
    sid = "ReadShared"
    actions = [
      "ec2:Describe*",
      "ecs:Describe*", "ecs:List*",
      "elasticloadbalancing:Describe*",
      "elasticache:Describe*", "elasticache:ListTagsForResource",
      "rds:Describe*", "rds:ListTagsForResource",
    ]
    resources = ["*"]
  }
  # 서비스·태스크 정의·ECR·인증서·리스너 규칙·타겟 그룹. 리스너 규칙과 인증서는 mecross ALB에 붙여야 해서 리소스로 좁히기 어렵다
  statement {
    sid       = "Compute"
    actions   = ["ecs:*", "ecr:*", "acm:*", "elasticloadbalancing:*"]
    resources = ["*"]
  }
  statement {
    sid       = "Secrets"
    actions   = ["ssm:*"]
    resources = ["arn:aws:ssm:${var.region}:${local.account_id}:parameter/${var.project}/*"]
  }
  statement {
    sid     = "Logs"
    actions = ["logs:*"]
    resources = [
      "arn:aws:logs:${var.region}:${local.account_id}:log-group:/ecs/${var.project}-*",
      "arn:aws:logs:${var.region}:${local.account_id}:log-group:/ecs/${var.project}-*:*",
    ]
  }
  # 실행·태스크·배포 역할. infra/bootstrap의 DeployRoles와 같은 집합에 ECS가 요구하는 PassRole·관리형 정책 부착을 더한다
  statement {
    sid = "ProjectRoles"
    actions = [
      "iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:UpdateRole", "iam:UpdateAssumeRolePolicy",
      "iam:TagRole", "iam:UntagRole", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies", "iam:ListInstanceProfilesForRole",
      "iam:PutRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy",
    ]
    resources = ["arn:aws:iam::${local.account_id}:role/${var.project}-*"]
  }
  statement {
    sid       = "PassRolesToEcs"
    actions   = ["iam:PassRole"]
    resources = ["arn:aws:iam::${local.account_id}:role/${var.project}-*"]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
  statement {
    sid       = "AttachExecutionPolicy"
    actions   = ["iam:AttachRolePolicy", "iam:DetachRolePolicy"]
    resources = ["arn:aws:iam::${local.account_id}:role/${var.project}-*"]
    condition {
      test     = "ArnEquals"
      variable = "iam:PolicyARN"
      values   = ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"]
    }
  }
  # data "aws_iam_openid_connect_provider"가 URL로 공급자를 찾을 때 List를 먼저 부른다. List는 리소스를 못 좁혀 *
  statement {
    sid       = "ListOidc"
    actions   = ["iam:ListOpenIDConnectProviders"]
    resources = ["*"]
  }
  statement {
    sid       = "ReadOidc"
    actions   = ["iam:GetOpenIDConnectProvider"]
    resources = [data.aws_iam_openid_connect_provider.github.arn]
  }
}

resource "aws_iam_role_policy" "terraform" {
  name   = "${var.project}-terraform"
  role   = aws_iam_role.terraform.id
  policy = data.aws_iam_policy_document.terraform.json
}
