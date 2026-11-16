# IAM 역할 셋. execution(ECS 에이전트: 이미지 pull·로그·SSM 주입), task(앱 코드: SES), deploy(deploy-backend.yml이 OIDC로 assume).
# Terraform 역할(mecrosspro-terraform)은 infra/bootstrap-a가 만든다

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ── execution ─────────────────────────────────────────────────────────────────

resource "aws_iam_role" "execution" {
  name               = "${var.project}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    actions   = ["ssm:GetParameters"]
    resources = values(local.secret_arns)
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "read-ssm-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# ── task ──────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "task" {
  name               = "${var.project}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# 초대 메일(SESv2, 키 없이 역할로). 발신 도메인(munjigi.dev) identity는 A에 아직 없다. 후속 작업
data "aws_iam_policy_document" "task" {
  statement {
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = ["arn:aws:ses:${var.region}:${local.a_account_id}:identity/*"]
  }
}

resource "aws_iam_role_policy" "task" {
  name   = "ses"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task.json
}

# ── deploy (GitHub Actions) ───────────────────────────────────────────────────
# main 브랜치의 production 환경에서만. 권한은 이 저장소 push, 마이그레이션 run-task, 이 서비스 갱신뿐

data "aws_iam_policy_document" "deploy_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # GitHub environment를 쓰는 job의 sub 형식. github_repo에 와일드카드(이름 자리 *)가 있어 StringLike
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:environment:production"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${var.project}-github-actions"
  assume_role_policy = data.aws_iam_policy_document.deploy_trust.json
}

locals {
  ecs_arn_prefix = "arn:aws:ecs:${var.region}:${local.a_account_id}"
}

data "aws_iam_policy_document" "deploy" {
  # 로그인 토큰은 리소스를 못 좁힌다
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  # push와 latest 재태그(BatchGetImage → PutImage)
  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage",
      "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }
  # 마이그레이션 태스크만, mecross 클러스터에서만 띄울 수 있다
  statement {
    sid       = "RunMigrate"
    actions   = ["ecs:RunTask"]
    resources = ["${local.ecs_arn_prefix}:task-definition/${var.project}-migrate:*"]
    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = [data.aws_ecs_cluster.a.arn]
    }
  }
  # wait tasks-stopped. 태스크 ARN은 ID만 달라 클러스터 단위로 연다
  statement {
    sid       = "WatchTasks"
    actions   = ["ecs:DescribeTasks"]
    resources = ["${local.ecs_arn_prefix}:task/${var.a.cluster_name}/*"]
  }
  statement {
    sid       = "UpdateService"
    actions   = ["ecs:UpdateService", "ecs:DescribeServices"]
    resources = ["${local.ecs_arn_prefix}:service/${var.a.cluster_name}/${var.project}-backend"]
  }
  # run-task가 태스크 정의의 두 역할을 ECS에 넘긴다
  statement {
    sid       = "PassRolesToTasks"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.execution.arn, aws_iam_role.task.arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
  # 마이그레이션 출력을 워크플로 로그에 그대로 보인다
  statement {
    sid       = "ReadMigrateLogs"
    actions   = ["logs:GetLogEvents"]
    resources = ["${aws_cloudwatch_log_group.migrate.arn}:*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "${var.project}-github-actions"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
