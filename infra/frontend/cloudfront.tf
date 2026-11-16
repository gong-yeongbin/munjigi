locals {
  # AWS 관리형 정책 ID. 콘솔의 "Policies > Cache / Origin request / Response headers"와 같다
  cache_policy_caching_optimized        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  cache_policy_caching_disabled         = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  origin_request_all_viewer_except_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  response_headers_security             = "67f7725c-6f97-4210-82d7-5512b31e9d03"
  s3_origin_id                          = "s3-frontend"
  api_origin_id                         = "api"

  # /api/* 를 넘길 백엔드. 변수로 덮어쓰지 않으면 api.<domain>. 도메인이 없으면 백엔드 연결도 없다
  api_origin = var.api_origin != "" ? var.api_origin : (local.use_domain ? "api.${var.domain}" : "")
  use_api    = local.api_origin != ""
}

# viewer-request 함수 둘. 코드는 functions/ 아래 파일. publish = true라 apply 즉시 LIVE 스테이지에 올라간다
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "munjigi-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/functions/spa-rewrite.js")
}

resource "aws_cloudfront_function" "api_strip_prefix" {
  name    = "munjigi-api-strip-prefix"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/functions/api-strip-prefix.js")
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "munjigi-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  comment             = "munjigi frontend"
  default_root_object = "index.html"
  # 도메인이 없으면 빈 집합. 그러면 *.cloudfront.net 주소만 받는다
  aliases         = local.hosts
  is_ipv6_enabled = true
  http_version    = "http2and3"
  # 한국·일본·미국·유럽. 전 세계(PriceClass_All)보다 싸고 지연 차이는 없다
  price_class = "PriceClass_200"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # 백엔드(A 계정 ALB의 api.<domain>). HTTPS로만 붙고 Host는 origin 도메인으로 바뀌어 ALB의 host 규칙에 맞는다
  dynamic "origin" {
    for_each = local.use_api ? [local.api_origin] : []
    content {
      domain_name = origin.value
      origin_id   = local.api_origin_id
      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior {
    target_origin_id           = local.s3_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = local.cache_policy_caching_optimized
    response_headers_policy_id = local.response_headers_security

    # SPA fallback. 확장자 없는 경로를 index.html로 바꾼다(functions/spa-rewrite.js). custom_error_response로 하면 /api/* 오류까지 200 HTML이 돼서 함수로 한다
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  # /api/* → 백엔드. 캐시 없음, 뷰어의 헤더·쿠키·쿼리를 전부 넘기되 Host만 origin 것으로.
  # https-only(redirect 아님): 외부 서비스의 웹훅 POST가 http로 오면 301에 본문이 날아가므로 아예 거절한다
  dynamic "ordered_cache_behavior" {
    for_each = local.use_api ? [1] : []
    content {
      path_pattern             = "/api/*"
      target_origin_id         = local.api_origin_id
      viewer_protocol_policy   = "https-only"
      allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods           = ["GET", "HEAD"]
      compress                 = false # CachingDisabled 정책은 압축 키를 안 켜서 켜도 효과가 없다
      cache_policy_id          = local.cache_policy_caching_disabled
      origin_request_policy_id = local.origin_request_all_viewer_except_host

      # /api 접두사를 떼고 넘긴다(functions/api-strip-prefix.js). 백엔드는 접두사 없이 받는다
      function_association {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.api_strip_prefix.arn
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # 도메인이 없으면 CloudFront 기본 인증서(*.cloudfront.net). 있으면 us-east-1의 ACM 인증서를 SNI로 쓴다
  viewer_certificate {
    cloudfront_default_certificate = !local.use_domain
    acm_certificate_arn            = one(aws_acm_certificate_validation.frontend[*].certificate_arn)
    ssl_support_method             = local.use_domain ? "sni-only" : null
    minimum_protocol_version       = local.use_domain ? "TLSv1.2_2021" : null
  }
}
