# ECS 로그 그룹. 스트림은 <컨테이너 이름>/<컨테이너 이름>/<태스크 ID>로 쌓인다(awslogs-stream-prefix = 컨테이너 이름)
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project}-backend"
  retention_in_days = 14
}

# 마이그레이션 태스크는 따로 둬서 배포 워크플로가 실패 원인을 바로 꺼내 보인다
resource "aws_cloudwatch_log_group" "migrate" {
  name              = "/ecs/${var.project}-migrate"
  retention_in_days = 14
}
