import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// 경로 파라미터 DTO. :projectId는 가드가 먼저 보지만 핸들러는 이 DTO로 숫자를 받는다
export class ProjectParamDto {
	@ApiProperty({ example: 10 })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	projectId: number;
}

export class ProjectDto {
	@ApiProperty({ example: 10 })
	id: number;

	@ApiProperty({ example: 1 })
	user_id: number;

	@ApiProperty({ example: 'shop' })
	name: string;

	@ApiProperty({ type: Date, nullable: true, description: '결제 실패로 상한을 넘어 정지된 시각. 정지 중에는 수신·전달을 멈춘다', example: null })
	suspended_at: Date | null;

	@ApiProperty({ example: '2026-09-30T00:00:00.000Z' })
	created_at: Date;

	@ApiProperty({ example: '2026-09-30T00:00:00.000Z' })
	updated_at: Date;
}

export class ProjectPageDto {
	@ApiProperty({ type: [ProjectDto] })
	data: ProjectDto[];

	@ApiProperty({ type: String, nullable: true, description: '다음 페이지 cursor. 없으면 null', example: '10' })
	next_cursor: string | null;
}

export class SigningSecretDto {
	@ApiProperty({ description: '전달 서명 키. 고객 서버가 이 키로 본문의 HMAC-SHA256을 계산해 X-Munjigi-Signature와 비교한다', example: 'rdsec_3q2-7wEAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRo' })
	signing_secret: string;
}
