import { DELIVERY_RATE_PER_SEC, ENDPOINT_LIMIT, INCLUDED_EVENTS, PROJECT_LIMIT, RETENTION_DAYS } from './plan-limits';

describe('plan-limits', () => {
	it('project 상한 — free 1, 유료 무제한', () => {
		expect(PROJECT_LIMIT).toEqual({ free: 1, pro: Infinity, business: Infinity });
	});

	it('월 포함 전달 — 전 플랜 1만', () => {
		expect(INCLUDED_EVENTS).toEqual({ free: 10_000, pro: 10_000, business: 10_000 });
	});

	it('목적지당 초당 전달 상한 — 5', () => {
		expect(DELIVERY_RATE_PER_SEC).toBe(5);
	});

	it('source·destination 상한 — free는 project당 각 3개, 유료 무제한', () => {
		expect(ENDPOINT_LIMIT).toEqual({ free: 3, pro: Infinity, business: Infinity });
	});

	it('보존일 — free 3, pro 7, business 30', () => {
		expect(RETENTION_DAYS).toEqual({ free: 3, pro: 7, business: 30 });
	});
});
