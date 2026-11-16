# ECS 서비스 하나(태스크 1개 = 컨테이너 api + worker)와 마이그레이션 태스크 정의. 클러스터·서브넷·보안 그룹은 mecross 것을 빌린다.
# 컨테이너 둘을 한 태스크에 두는 이유는 비용(태스크·공인 IP 각 1개). 같이 재시작되는 대가는 지금 트래픽에서 무시한다.
# 나중에 서비스를 둘로 나누는 건 이 파일만 바꾸면 된다

locals {
  container_port = 3001
  image          = "${aws_ecr_repository.backend.repository_url}:latest"

  environment = {
    NODE_ENV         = "production"
    PORT             = tostring(local.container_port)
    LOG_LEVEL        = "info"
    APP_URL          = local.app_url
    MAIL_FROM        = local.mail_from
    GOOGLE_CLIENT_ID = var.google_client_id
    # A Valkey는 TLS·AUTH 없음. mecross가 DB 0을 쓰므로 DB 1로 키를 나눈다. 메모리·용량은 격리되지 않는다
    REDIS_URL = "redis://${data.aws_elasticache_replication_group.valkey.primary_endpoint_address}:6379/1"
  }

  container_environment = [for k, v in local.environment : { name = k, value = v }]
  container_secrets     = [for k, arn in local.secret_arns : { name = k, valueFrom = arn }]

  log_configuration = {
    logDriver = "awslogs"
    options = {
      "awslogs-group"  = aws_cloudwatch_log_group.backend.name
      "awslogs-region" = var.region
    }
  }
}

# 사양은 mecross 서비스와 같은 1 vCPU / 2 GiB(사용자 결정 2026-11-16). api·worker 두 Node 프로세스가 한 태스크에 있다
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  # Graviton. 이미지는 arm64로 빌드한다(Dockerfile --platform=linux/arm64)
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = local.image
      essential = true
      portMappings = [
        { containerPort = local.container_port, protocol = "tcp" }
      ]
      environment      = local.container_environment
      secrets          = local.container_secrets
      logConfiguration = merge(local.log_configuration, { options = merge(local.log_configuration.options, { "awslogs-stream-prefix" = "api" }) })
    },
    {
      name      = "worker"
      image     = local.image
      essential = true
      command   = ["node", "dist/main.consumer"]
      # 전달 중인 웹훅을 마무리하고 끝낼 시간. 기본 30초가 상한이라 그대로 적어 둔다
      stopTimeout      = 30
      environment      = local.container_environment
      secrets          = local.container_secrets
      logConfiguration = merge(local.log_configuration, { options = merge(local.log_configuration.options, { "awslogs-stream-prefix" = "worker" }) })
    },
  ])
}

# prisma migrate deploy 한 번 돌리고 끝나는 태스크. 배포 워크플로가 서비스 갱신 전에 run-task로 띄운다. DATABASE_URL만 필요하다
resource "aws_ecs_task_definition" "migrate" {
  family                   = "${var.project}-migrate"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = "migrate"
      image     = "${aws_ecr_repository.backend.repository_url}:migrate"
      essential = true
      secrets = [
        { name = "DATABASE_URL", valueFrom = local.secret_arns.DATABASE_URL }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.migrate.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "migrate"
        }
      }
    },
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "${var.project}-backend"
  cluster         = data.aws_ecs_cluster.a.arn
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  health_check_grace_period_seconds = 60

  # mecross 태스크와 같은 서브넷·SG. NAT가 없어 공인 IP로 나간다(ECR pull, 목적지 서버로의 웹훅 전달)
  network_configuration {
    subnets          = [data.aws_subnet.app.id]
    security_groups  = [data.aws_security_group.app.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = local.container_port
  }

  # 새 태스크가 계속 죽으면 배포를 멈추고 이전 태스크 정의로 되돌린다. 첫 apply처럼 이전이 없으면 배포만 FAILED로 멈춘다
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # 타겟 그룹이 리스너 규칙으로 ALB에 붙은 뒤에 서비스를 만들어야 한다. 아니면 "target group is not associated" 오류
  depends_on = [aws_lb_listener_rule.api]
}
