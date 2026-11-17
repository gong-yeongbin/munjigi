import { ENDPOINT_LIMIT, INCLUDED_EVENTS, PROJECT_LIMIT, RETENTION_DAYS } from './plan-limits';

describe('plan-limits', () => {
	it('project 상한 — free 1, 유료 무제한', () => {
		expect(PROJECT_LIMIT).toEqual({ free: 1, team: Infinity, business: Infinity });
	});

	it('월 포함 이벤트 — free 1,000, 유료 1만', () => {
		expect(INCLUDED_EVENTS).toEqual({ free: 1_000, team: 10_000, business: 10_000 });
	});

	it('source·destination 상한 — free는 project당 각 3개, 유료 무제한', () => {
		expect(ENDPOINT_LIMIT).toEqual({ free: 3, team: Infinity, business: Infinity });
	});

	it('보존일 — free 3, team 7, business 30', () => {
		expect(RETENTION_DAYS).toEqual({ free: 3, team: 7, business: 30 });
	});
});
