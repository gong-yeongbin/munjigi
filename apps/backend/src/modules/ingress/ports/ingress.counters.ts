// 인그레스 경로에서 세는 것. DB 집계를 넣지 않으려고 Valkey에 둔다
export interface IngressCounters {
	// user의 그 달(yyyymm) 사용량을 count(목적지로 보낼 전달 수)만큼 올리고 올린 뒤의 값을 준다. 음수면 그만큼 되돌린다
	incrementUsage(userId: number, period: string, count: number): Promise<number>;
	// free가 포함량을 넘긴 뒤 보류로 받아 둔 양을 count만큼 올리고 올린 뒤의 값을 준다. 음수면 되돌린다
	incrementHeld(userId: number, period: string, count: number): Promise<number>;
	// 그 달의 사용량. 아직 없으면 0
	getUsage(userId: number, period: string): Promise<number>;
	// 이 소스의 거부 기록을 하나 더 남겨도 되는가. 분당 상한 안이면 true
	allowRejectionRecord(sourceId: number, now: Date): Promise<boolean>;
}

export const INGRESS_COUNTERS = Symbol('IngressCounters');
