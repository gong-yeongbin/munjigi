import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Actor, Authenticated } from '@/common/auth/decorators';
import { UsageDto } from './dto/usage.dto';
import { UsageService } from './usage.service';

// 내 사용량. /users/me의 하위라 users 모듈과 prefix를 나눠 쓴다
@ApiTags('usage')
@Controller('users/me/usage')
export class UsageController {
	constructor(private readonly usage: UsageService) {}

	@Authenticated()
	@Get()
	@ApiOperation({ summary: '이번 달(KST) 내 사용량과 포함량, 프로젝트별 이벤트 수를 조회한다' })
	@ApiResponse({ status: 200, type: UsageDto })
	@ApiResponse({ status: 404, description: 'user_not_found — 행이 지워진 뒤의 토큰' })
	get(@Actor() actor: Actor): Promise<UsageDto> {
		return this.usage.get(actor.user_id);
	}
}
