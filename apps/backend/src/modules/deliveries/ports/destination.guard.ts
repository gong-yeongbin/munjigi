// 서킷을 본 결과. half_open이면 probe가 true인 워커 하나만 보낸다. open이면 remaining_ms 뒤에 다시 본다
export type CircuitCheck = { state: 'closed' } | { state: 'half_open'; probe: boolean } | { state: 'open'; remaining_ms: number };

// 목적지 보호. 동시 전달 수 제한(세마포어)과 서킷 브레이커. 워커 여러 대가 같은 값을 봐야 해서 Valkey에 둔다
export interface DestinationGuard {
	// 동시 전달 자리를 잡는다. 자리가 없으면 null. 잡은 자리는 holdMs 뒤 저절로 풀려, 워커가 보내다 죽어도 자리가 새지 않는다
	acquire(destinationId: number, limit: number, holdMs: number): Promise<string | null>;
	release(destinationId: number, token: string): Promise<void>;
	// 이 목적지로 지금(now가 속한 초) 하나 더 보내도 되는가. 되면 0, 초당 상한을 넘었으면 기다릴 시간(ms).
	// 그 초에 몇 번째로 왔는지에 따라 뒤 초로 나눠 보낸다
	throttle(destinationId: number, limitPerSec: number, now: Date): Promise<number>;
	circuit(destinationId: number): Promise<CircuitCheck>;
	// 보낸 결과를 서킷에 반영한다. 성공은 연속 실패를 지우고, 실패는 하나 더해 임계값이면 연다
	recordSuccess(destinationId: number): Promise<void>;
	recordFailure(destinationId: number): Promise<void>;
}

export const DESTINATION_GUARD = Symbol('DestinationGuard');
// 목적지당 초당 전달 상한. 값은 common/plan-limits.ts
export const DELIVERY_RATE = Symbol('DeliveryRate');
