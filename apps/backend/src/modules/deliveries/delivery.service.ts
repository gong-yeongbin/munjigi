import { ConflictException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { delivery } from '@prisma/client';
import { type ListQueryDto, type Page, toPage } from '@/common/http/pagination';
import { INCLUDED_EVENTS } from '@/common/plan-limits';
import { usagePeriod } from '@/modules/ingress/domain/usage-period';
import { INGRESS_COUNTERS, type IngressCounters } from '@/modules/ingress/ports/ingress.counters';
import { type BulkRetryFilter, DELIVERY_API_REPOSITORY, type DeliveryApiRepository, type DeliveryDetail, type DeliveryFilter } from './ports/delivery-api.repository';
import { DELIVERY_QUEUE, type DeliveryQueue } from './ports/delivery.queue';

const NOT_FOUND = { code: 'delivery_not_found', message: '전달이 없습니다.' };
const STILL_PAUSED = { code: 'delivery_held', message: '연결이 일시 정지돼 있거나 프로젝트가 정지돼 있어 보낼 수 없습니다.' };
const USAGE_EXCEEDED = { code: 'usage_exceeded', message: '이번 달 무료 사용량을 넘었습니다.' };
// 일괄 재시도 한 번에 돌리는 최대 수. 더 있으면 다시 부른다
export const BULK_RETRY_LIMIT = 1_000;

// 관리 API. 조회와 수동 재시도·취소. 보내는 일은 워커(delivery.worker.ts)가 한다
@Injectable()
export class DeliveryService {
	constructor(
		@Inject(DELIVERY_API_REPOSITORY) private readonly deliveries: DeliveryApiRepository,
		@Inject(DELIVERY_QUEUE) private readonly queue: DeliveryQueue,
		@Inject(INGRESS_COUNTERS) private readonly counters: IngressCounters,
	) {}

	async list(projectId: number, query: ListQueryDto & Omit<DeliveryFilter, 'event_id'> & { event_id?: string }): Promise<Page<delivery>> {
		const filter = { status: query.status, destination_id: query.destination_id, event_id: query.event_id === undefined ? undefined : BigInt(query.event_id) };
		const cursor = query.cursor === undefined ? null : BigInt(query.cursor);
		return toPage(await this.deliveries.list(projectId, filter, cursor, query.limit + 1), query.limit, (d) => d.id);
	}

	async get(projectId: number, id: bigint): Promise<DeliveryDetail> {
		return (await this.deliveries.find(projectId, id)) ?? this.notFound();
	}

	// 같은 delivery에 시도를 하나 더한다. 횟수는 이어진다. 처리 중인 것만 막고 끝난 것(성공 포함)은 다시 보낼 수 있다.
	// 예정돼 있던 자동 재시도는 지운다. 안 지우면 그 시각에 한 번 더 간다.
	// 보류(held)된 것은 수신 때 세지 않은 전달이라 여기서 사용량에 넣는다
	async retry(projectId: number, id: bigint, now = new Date()): Promise<delivery> {
		const held = await this.deliveries.findHeld(projectId, id);
		if (held?.paused) throw new ConflictException(STILL_PAUSED);
		const quota = held ? await this.quota(projectId, now) : null;
		if (quota && quota.remaining < 1) throw new HttpException(USAGE_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS);

		const marked = await this.deliveries.markRetry(projectId, id);
		if (marked === 'not_found') this.notFound();
		if (marked === 'pending') throw new ConflictException({ code: 'delivery_pending', message: '처리 중인 전달입니다.' });
		await this.queue.unschedule([id]);
		await this.queue.enqueue([{ delivery_id: id, trigger: 'manual' }]);
		if (quota) await this.counters.incrementUsage(quota.user_id, quota.period, 1);
		return marked;
	}

	// 조건에 맞는 것을 한 번에 최대 1,000건 다시 보낸다. 돌린 수를 준다.
	// 보류(held)는 돌린 수만큼 사용량에 넣고, free는 남은 양까지만 돌린다
	async bulkRetry(projectId: number, filter: BulkRetryFilter, now = new Date()): Promise<{ count: number }> {
		const quota = filter.status === 'held' ? await this.quota(projectId, now) : null;
		if (quota && quota.remaining < 1) throw new HttpException(USAGE_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS);

		const ids = await this.deliveries.markBulkRetry(projectId, filter, Math.min(BULK_RETRY_LIMIT, quota?.remaining ?? Infinity));
		if (ids.length > 0) {
			await this.queue.unschedule(ids);
			await this.queue.enqueue(ids.map((delivery_id) => ({ delivery_id, trigger: 'bulk_retry' as const })));
			if (quota) await this.counters.incrementUsage(quota.user_id, quota.period, ids.length);
		}
		return { count: ids.length };
	}

	// 이번 달 더 보낼 수 있는 양. 유료는 넘은 만큼 청구하므로 끝이 없다
	private async quota(projectId: number, now: Date): Promise<{ user_id: number; period: string; remaining: number }> {
		const owner = await this.deliveries.findOwner(projectId);
		const period = usagePeriod(now);
		const remaining = owner.plan === 'free' ? INCLUDED_EVENTS.free - (await this.counters.getUsage(owner.user_id, period)) : Infinity;
		return { user_id: owner.user_id, period, remaining };
	}

	// 예정된 자동 재시도를 멈추고 canceled로 닫는다. 이미 끝난 것은 취소할 게 없다
	async cancel(projectId: number, id: bigint): Promise<delivery> {
		const canceled = await this.deliveries.cancel(projectId, id);
		if (canceled === 'not_found') this.notFound();
		if (canceled === 'closed') throw new ConflictException({ code: 'delivery_closed', message: '이미 끝난 전달입니다.' });
		await this.queue.unschedule([id]);
		return canceled;
	}

	private notFound(): never {
		throw new NotFoundException(NOT_FOUND);
	}
}
