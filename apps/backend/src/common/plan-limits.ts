import type { Plan } from '@prisma/client';

// 플랜별 값은 코드 상수다. 근거는 plan.md 결정 11. 플랜은 user에 붙는다(조직 제거, 2026-11-17).
export const PROJECT_LIMIT: Record<Plan, number> = { free: 1, pro: Infinity, business: Infinity };
// user의 월 포함량. 세는 단위는 목적지로 보내는 전달(웹훅 하나가 목적지 세 곳이면 3). free는 넘으면 받아서 저장하되 전달을 보류하고, 유료는 넘은 만큼 종량으로 청구한다(4. billing)
export const INCLUDED_EVENTS: Record<Plan, number> = { free: 10_000, pro: 10_000, business: 10_000 };
// free가 포함량을 넘긴 뒤 전달 없이 받아만 두는(held) 양의 상한. 포함량과 합쳐 2배다. 넘으면 그때부터 인그레스가 429로 거부한다
export const FREE_HOLD_LIMIT = 10_000;
// 목적지 하나로 1초에 보내는 전달 수의 상한. 전 플랜 같다(Hookdeck과 같은 값). 넘는 전달은 워커가 뒤로 미룬다
export const DELIVERY_RATE_PER_SEC = 5;
// source·destination 각각, project당
export const ENDPOINT_LIMIT: Record<Plan, number> = { free: 3, pro: Infinity, business: Infinity };
// 이벤트·전달 기록·거부 기록을 보관하는 날수(Hookdeck과 같다). 지나면 보존 배치가 지운다
export const RETENTION_DAYS: Record<Plan, number> = { free: 3, pro: 7, business: 30 };
