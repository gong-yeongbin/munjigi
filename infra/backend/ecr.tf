# 백엔드 이미지 저장소. 배포 워크플로가 :<sha>와 :migrate를 push하고 마이그레이션이 성공한 뒤에만 :latest를 재태그한다. 재태그 때문에 MUTABLE
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "태그가 떨어진 이미지(재태그로 밀린 옛 migrate 등)는 7일 뒤 삭제"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "최근 20개만 남긴다. 롤백은 이 안의 :<sha>를 latest로 재태그한다"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = { type = "expire" }
      },
    ]
  })
}
