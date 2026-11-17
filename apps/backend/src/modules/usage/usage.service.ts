import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INCLUDED_EVENTS } from '@/common/plan-limits';
import { usagePeriod, usagePeriodStart } from '@/modules/ingress/domain/usage-period';
import { INGRESS_COUNTERS, type IngressCounters } from '@/modules/ingress/ports/ingress.counters';
import type { UsageDto } from './dto/usage.dto';
import { USAGE_REPOSITORY, type UsageRepository } from './ports/usage.repository';

@Injectable()
export class UsageService {
	constructor(
		@Inject(USAGE_REPOSITORY) private readonly usage: UsageRepository,
		@Inject(INGRESS_COUNTERS) private readonly counters: IngressCounters,
	) {}

	// 이번 달(KST) user 사용량. used는 인그레스가 세는 Valkey 카운터(리플레이 포함·거부 제외)라 청구 기준과 같다.
	// projects는 DB의 event 행을 센 조회용 수치라 보존 기간이 지나 지워진 만큼 used보다 작을 수 있다
	async get(userId: number, now = new Date()): Promise<UsageDto> {
		const plan = await this.usage.findPlan(userId);
		// JWT는 서명만 검증하므로 행이 지워진 뒤에도 만료 전까지 유효하다
		if (!plan) throw new NotFoundException({ code: 'user_not_found', message: '유저가 없습니다.' });
		const period = usagePeriod(now);
		const [used, projects] = await Promise.all([this.counters.getUsage(userId, period), this.usage.countEventsByProject(userId, usagePeriodStart(now))]);
		return { period, period_start: usagePeriodStart(now), plan, included: INCLUDED_EVENTS[plan], used, projects };
	}
}
