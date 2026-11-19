import type { Plan } from '@prisma/client';

// 프로젝트별 이번 달 전달 수. 조회용 수치일 뿐 과금은 user 합산
export type ProjectUsage = { project_id: number; name: string; delivery_count: number };

export interface UsageRepository {
	findPlan(userId: number): Promise<Plan | null>;
	// since(KST 월초) 이후 받은 이벤트의 delivery를 project별로 센다. 없는 project도 0으로 넣는다
	countDeliveriesByProject(userId: number, since: Date): Promise<ProjectUsage[]>;
}

export const USAGE_REPOSITORY = Symbol('UsageRepository');
