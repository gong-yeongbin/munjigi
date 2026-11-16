# 빌려 쓰는 mecross 자원(A 계정)을 이름으로 찾는다. 만들지 않고 읽기만 하므로 monorepo-practice는 한 줄도 안 바뀐다

# VPC는 ALB에서 얻는다. A에 Name=mecross-vpc 태그가 붙은 VPC가 둘 있어 태그로는 하나로 좁혀지지 않았고,
# ALB 이름은 계정·리전 안에서 유일하다. 서브넷·SG·타겟 그룹은 어차피 ALB와 같은 VPC여야 한다
data "aws_lb" "a" {
  name = var.a.alb_name
}

locals {
  vpc_id = data.aws_lb.a.vpc_id
}

# 태스크를 두는 서브넷. mecross 태스크와 같은 단일 AZ(RDS·Valkey와 같은 AZ라 전송료가 없다). NAT가 없어 공인 IP가 필요하다
data "aws_subnet" "app" {
  vpc_id = local.vpc_id
  filter {
    name   = "tag:Name"
    values = [var.a.app_subnet_name]
  }
}

# mecross 태스크의 보안 그룹을 그대로 쓴다. 이미 ALB→3001 인바운드, RDS·Valkey SG의 허용 대상, egress 전체다.
# A의 SG가 inline 규칙이라 여기서 규칙을 붙이면 A의 다음 apply가 지운다. 그래서 새 SG 대신 공유한다
data "aws_security_group" "app" {
  vpc_id = local.vpc_id
  name   = var.a.app_sg_name
}

data "aws_lb_listener" "https" {
  load_balancer_arn = data.aws_lb.a.arn
  port              = 443
}

data "aws_ecs_cluster" "a" {
  cluster_name = var.a.cluster_name
}

# 노드형 Valkey, 클러스터 모드 꺼짐, TLS·AUTH 없음. primary 엔드포인트 하나로 접속한다
data "aws_elasticache_replication_group" "valkey" {
  replication_group_id = var.a.valkey_id
}

data "aws_db_instance" "postgres" {
  db_instance_identifier = var.a.rds_id
}

# GitHub OIDC 공급자는 A에 이미 있다(mecross가 만듦). 배포 역할의 trust에 쓴다
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}
