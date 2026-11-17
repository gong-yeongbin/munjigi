import type { Plan } from '@prisma/client';

// 플랜별 값은 코드 상수다. 근거는 plan.md 결정 11. 플랜은 user에 붙는다(조직 제거, 2026-11-17).
export const PROJECT_LIMIT: Record<Plan, number> = { free: 1, pro: Infinity, business: Infinity };
// user의 월 포함 이벤트 수. free는 넘으면 인그레스가 429로 거부하고, 유료는 넘은 만큼 종량으로 청구한다(4. billing)
export const INCLUDED_EVENTS: Record<Plan, number> = { free: 1_000, pro: 10_000, business: 10_000 };
// source·destination 각각, project당
export const ENDPOINT_LIMIT: Record<Plan, number> = { free: 3, pro: Infinity, business: Infinity };
// 이벤트·전달 기록·거부 기록을 보관하는 날수(Hookdeck과 같다). 지나면 보존 배치가 지운다
export const RETENTION_DAYS: Record<Plan, number> = { free: 3, pro: 7, business: 30 };
