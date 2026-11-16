# api.<domain>을 mecross ALB에 얹는다. ALB와 443 리스너는 mecross 것이고, 여기서는 인증서 하나·host 규칙 하나·타겟 그룹 하나만 붙인다.
# 인증서는 ALB와 같은 계정(A)에 있어야 하고, 검증 레코드와 A 레코드는 호스팅 존이 있는 B에 쓴다(provider b)

data "aws_route53_zone" "root" {
  provider = aws.b
  name     = "${var.domain}."
}

resource "aws_acm_certificate" "api" {
  domain_name       = local.api_host
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 검증 레코드의 for_each 키는 변수에서 바로 아는 도메인 이름으로 두고 값만 인증서에서 찾는다(frontend dns.tf와 같은 이유)
locals {
  acm_validation = { for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => dvo }
}

resource "aws_route53_record" "acm_validation" {
  provider        = aws.b
  for_each        = toset([local.api_host])
  zone_id         = data.aws_route53_zone.root.zone_id
  name            = local.acm_validation[each.key].resource_record_name
  type            = local.acm_validation[each.key].resource_record_type
  ttl             = 60
  records         = [local.acm_validation[each.key].resource_record_value]
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for r in aws_route53_record.acm_validation : r.fqdn]
}

# 리스너의 기본 인증서는 mecross(admin-api.mecrosspro.com) 것. SNI로 두 번째 인증서를 더한다
resource "aws_lb_listener_certificate" "api" {
  listener_arn    = data.aws_lb_listener.https.arn
  certificate_arn = aws_acm_certificate_validation.api.certificate_arn
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project}-backend"
  port        = local.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = local.vpc_id

  deregistration_delay = 30

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# host 규칙. 리스너의 기본 동작(mecross-backend로 forward)보다 먼저 평가된다. 기존 규칙이 0개라 우선순위 충돌은 없다
resource "aws_lb_listener_rule" "api" {
  listener_arn = data.aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = [local.api_host]
    }
  }
}

resource "aws_route53_record" "api" {
  provider = aws.b
  zone_id  = data.aws_route53_zone.root.zone_id
  name     = local.api_host
  type     = "A"

  alias {
    name                   = data.aws_lb.a.dns_name
    zone_id                = data.aws_lb.a.zone_id
    evaluate_target_health = false
  }
}
