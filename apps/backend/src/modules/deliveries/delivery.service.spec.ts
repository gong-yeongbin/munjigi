import { ConflictException, NotFoundException } from '@nestjs/common';
import type { IngressCounters } from '@/modules/ingress/ports/ingress.counters';
import type { delivery, Plan } from '@prisma/client';
import { BULK_RETRY_LIMIT, DeliveryService } from './delivery.service';
import type { BulkRetryFilter, DeliveryApiRepository, DeliveryFilter } from './ports/delivery-api.repository';
import type { DeliveryQueue, QueuedDelivery } from './ports/delivery.queue';

const PROJECT = 10;
const base: delivery = { id: 1n, event_id: 120n, destination_id: 3, connection_id: 1, status: 'failed', attempt: 2, next_attempt_at: new Date('2026-10-07T00:10:00Z'), last_status_code: 503, last_error: null, created_at: new Date(0), updated_at: new Date(0) };

// port를 in-memory fake로 둔다. 행마다 어느 project의 것인지 같이 들고 있는다
class FakeDeliveries implements DeliveryApiRepository {
	rows: (delivery & { project_id: number })[] = [
		{ ...base, id: 3n, status: 'dead', project_id: PROJECT },
		{ ...base, id: 2n, status: 'pending', project_id: PROJECT },
		{ ...base, id: 1n, project_id: PROJECT },
		{ ...base, id: 9n, status: 'dead', project_id: PROJECT + 1 },
	];
	bulk: BulkRetryFilter | null = null;
	limit: number | null = null;
	// 보류된 것의 연결이 아직 멈춰 있는가
	paused = false;
	plan: Plan = 'pro';

	findHeld(projectId: number, id: bigint) {
		return Promise.resolve(this.mine(projectId, id)?.status === 'held' ? { paused: this.paused } : null);
	}
	findOwner() {
		return Promise.resolve({ user_id: 1, plan: this.plan });
	}

	private mine(projectId: number, id: bigint) {
		return this.rows.find((r) => r.project_id === projectId && r.id === id);
	}
	list(projectId: number, filter: DeliveryFilter, cursor: bigint | null, take: number) {
		return Promise.resolve(this.rows.filter((r) => r.project_id === projectId && (filter.status === undefined || r.status === filter.status) && (filter.event_id === undefined || r.event_id === filter.event_id) && (cursor === null || r.id < cursor)).slice(0, take));
	}
	find(projectId: number, id: bigint) {
		const row = this.mine(projectId, id);
		return Promise.resolve(row ? { ...row, attempts: [] } : null);
	}
	markRetry(projectId: number, id: bigint) {
		const row = this.mine(projectId, id);
		if (!row) return Promise.resolve('not_found' as const);
		if (row.status === 'pending') return Promise.resolve('pending' as const);
		Object.assign(row, { status: 'pending', next_attempt_at: null });
		return Promise.resolve(row);
	}
	markBulkRetry(projectId: number, filter: BulkRetryFilter, limit: number) {
		this.bulk = filter;
		this.limit = limit;
		const picked = this.rows.filter((r) => r.project_id === projectId && r.status === filter.status).slice(0, limit);
		for (const row of picked) Object.assign(row, { status: 'pending', next_attempt_at: null });
		return Promise.resolve(picked.map((r) => r.id));
	}
	cancel(projectId: number, id: bigint) {
		const row = this.mine(projectId, id);
		if (!row) return Promise.resolve('not_found' as const);
		if (!['pending', 'failed', 'held'].includes(row.status)) return Promise.resolve('closed' as const);
		Object.assign(row, { status: 'canceled', next_attempt_at: null });
		return Promise.resolve(row);
	}
}

class FakeCounters implements Pick<IngressCounters, 'incrementUsage' | 'getUsage'> {
	used = 0;
	calls: [number, string, number][] = [];
	incrementUsage(userId: number, period: string, count: number) {
		this.calls.push([userId, period, count]);
		this.used += count;
		return Promise.resolve(this.used);
	}
	getUsage() {
		return Promise.resolve(this.used);
	}
}

class FakeQueue implements Pick<DeliveryQueue, 'enqueue' | 'unschedule'> {
	enqueued: QueuedDelivery[] = [];
	unscheduled: bigint[] = [];
	enqueue(items: QueuedDelivery[]) {
		this.enqueued.push(...items);
		return Promise.resolve();
	}
	unschedule(ids: bigint[]) {
		this.unscheduled.push(...ids);
		return Promise.resolve();
	}
}

describe('DeliveryService', () => {
	let deliveries: FakeDeliveries;
	let queue: FakeQueue;
	let counters: FakeCounters;
	let service: DeliveryService;

	beforeEach(() => {
		deliveries = new FakeDeliveries();
		queue = new FakeQueue();
		counters = new FakeCounters();
		service = new DeliveryService(deliveries, queue as unknown as DeliveryQueue, counters as unknown as IngressCounters);
	});

	it('list — 필터(event_id는 BigInt로)·커서를 넘기고 limit + 1로 다음 페이지를 판단한다', async () => {
		const page = await service.list(PROJECT, { limit: 2 });
		expect(page.data.map((d) => d.id)).toEqual([3n, 2n]);
		expect(page.next_cursor).toBe('2');
		expect((await service.list(PROJECT, { limit: 2, cursor: 2 })).data.map((d) => d.id)).toEqual([1n]);
		expect((await service.list(PROJECT, { limit: 50, status: 'dead', event_id: '120' })).data.map((d) => d.id)).toEqual([3n]);
		expect((await service.list(PROJECT, { limit: 50, event_id: '121' })).data).toEqual([]);
	});

	it('get — 시도 기록을 같이 준다. 없거나 타 project면 404', async () => {
		expect(await service.get(PROJECT, 1n)).toMatchObject({ id: 1n, attempts: [] });
		await expect(service.get(PROJECT, 9n)).rejects.toThrow(NotFoundException);
	});

	describe('retry', () => {
		it('pending으로 돌리고 예약을 지운 뒤 manual 사유로 큐에 넣는다', async () => {
			expect(await service.retry(PROJECT, 1n)).toMatchObject({ id: 1n, status: 'pending', next_attempt_at: null, attempt: 2 });
			expect(queue.unscheduled).toEqual([1n]);
			expect(queue.enqueued).toEqual([{ delivery_id: 1n, trigger: 'manual' }]);
		});

		it('처리 중이면 409, 없거나 타 project면 404. 큐에 넣지 않는다', async () => {
			await expect(service.retry(PROJECT, 2n)).rejects.toThrow(ConflictException);
			await expect(service.retry(PROJECT, 9n)).rejects.toThrow(NotFoundException);
			expect(queue.enqueued).toEqual([]);
		});
	});

	describe('보류(held)된 것을 다시 보내기 — 수신 때 세지 않았으므로 여기서 사용량에 넣는다', () => {
		const NOW = new Date('2026-10-15T03:00:00Z');
		const hold = (...ids: bigint[]) => {
			for (const row of deliveries.rows) if (ids.includes(row.id)) row.status = 'held';
		};

		it('한 건 재시도 → 사용량 +1. held가 아닌 것은 넣지 않는다', async () => {
			hold(1n);
			expect(await service.retry(PROJECT, 1n, NOW)).toMatchObject({ id: 1n, status: 'pending' });
			expect(counters.calls).toEqual([[1, '202610', 1]]);
			expect(queue.enqueued).toEqual([{ delivery_id: 1n, trigger: 'manual' }]);

			await service.retry(PROJECT, 3n, NOW);
			expect(counters.calls).toHaveLength(1);
		});

		it('연결이 아직 멈춰 있으면 409 delivery_held. 돌리지 않고 세지 않는다', async () => {
			hold(1n);
			deliveries.paused = true;
			await expect(service.retry(PROJECT, 1n, NOW)).rejects.toMatchObject({ response: { code: 'delivery_held' }, status: 409 });
			expect(deliveries.rows.find((r) => r.id === 1n)!.status).toBe('held');
			expect(counters.calls).toEqual([]);
			expect(queue.enqueued).toEqual([]);
		});

		it('free는 남은 양이 없으면 429 usage_exceeded. 남아 있으면 보내고 센다', async () => {
			hold(1n);
			deliveries.plan = 'free';
			counters.used = 10_000;
			await expect(service.retry(PROJECT, 1n, NOW)).rejects.toMatchObject({ response: { code: 'usage_exceeded' }, status: 429 });
			await expect(service.bulkRetry(PROJECT, { status: 'held' }, NOW)).rejects.toMatchObject({ response: { code: 'usage_exceeded' }, status: 429 });
			expect(deliveries.rows.find((r) => r.id === 1n)!.status).toBe('held');
			expect(counters.calls).toEqual([]);

			counters.used = 9_999;
			await service.retry(PROJECT, 1n, NOW);
			expect(counters.used).toBe(10_000);
		});

		it('일괄 재시도 → 돌린 수만큼 넣는다. free는 남은 양까지만 돌린다', async () => {
			hold(1n, 3n);
			expect(await service.bulkRetry(PROJECT, { status: 'held' }, NOW)).toEqual({ count: 2 });
			expect(deliveries.limit).toBe(BULK_RETRY_LIMIT);
			expect(counters.calls).toEqual([[1, '202610', 2]]);

			hold(1n, 3n);
			deliveries.plan = 'free';
			counters.used = 9_999;
			expect(await service.bulkRetry(PROJECT, { status: 'held' }, NOW)).toEqual({ count: 1 });
			expect(deliveries.limit).toBe(1);
			expect(counters.used).toBe(10_000);
		});

		it('held가 아닌 일괄 재시도는 세지 않는다. 맞는 held가 없으면 0', async () => {
			await service.bulkRetry(PROJECT, { status: 'dead' }, NOW);
			expect(await service.bulkRetry(PROJECT, { status: 'held' }, NOW)).toEqual({ count: 0 });
			expect(counters.calls).toEqual([]);
		});
	});

	describe('bulkRetry', () => {
		it('조건을 저장소에 넘기고 한 번에 최대 1,000건을 bulk_retry 사유로 큐에 넣는다. 돌린 수를 준다', async () => {
			const filter = { status: 'dead' as const, destination_id: 3, created_after: new Date('2026-10-01T00:00:00Z') };
			expect(await service.bulkRetry(PROJECT, filter)).toEqual({ count: 1 });
			expect(deliveries.bulk).toEqual(filter);
			expect(queue.unscheduled).toEqual([3n]);
			expect(queue.enqueued).toEqual([{ delivery_id: 3n, trigger: 'bulk_retry' }]);
			expect(BULK_RETRY_LIMIT).toBe(1_000);
		});

		it('맞는 것이 없으면 0이고 큐를 건드리지 않는다', async () => {
			expect(await service.bulkRetry(PROJECT, { status: 'canceled' })).toEqual({ count: 0 });
			expect(queue.unscheduled).toEqual([]);
			expect(queue.enqueued).toEqual([]);
		});
	});

	describe('cancel', () => {
		it('canceled로 닫고 예약을 지운다', async () => {
			expect(await service.cancel(PROJECT, 1n)).toMatchObject({ id: 1n, status: 'canceled', next_attempt_at: null });
			expect(queue.unscheduled).toEqual([1n]);
		});

		it('이미 끝났으면 409, 없으면 404', async () => {
			await expect(service.cancel(PROJECT, 3n)).rejects.toThrow(ConflictException);
			await expect(service.cancel(PROJECT, 9n)).rejects.toThrow(NotFoundException);
			expect(queue.unscheduled).toEqual([]);
		});
	});
});
