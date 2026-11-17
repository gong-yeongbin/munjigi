import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

// 요금 페이지의 자주 묻는 질문. 값은 plan.md 결정 11과 같다
export const FAQ = [
	{ q: '포함 이벤트를 넘으면 어떻게 되나요?', a: 'Starter 플랜은 그 달의 남은 웹훅을 받지 않고 429로 응답합니다. 보내는 쪽은 실패를 확인하고 다시 보낼 수 있습니다. Pro 플랜은 초과분을 10만 건당 10,000원부터 청구하며, 사용량이 많을수록 단가가 낮아집니다.' },
	{ q: '플랜은 언제 바꿀 수 있나요?', a: '가입하면 Starter 플랜으로 시작합니다. 플랜 변경과 결제 기능은 준비 중입니다.' },
	{ q: '이벤트는 무엇을 세나요?', a: '받아서 저장한 웹훅 한 건이 이벤트 하나입니다. 목적지가 여러 곳이어도 한 건으로 세고, 같은 웹훅이 다시 들어오거나 재시도되는 경우는 세지 않습니다. 대시보드에서 리플레이한 경우에만 새 이벤트로 집계됩니다.' },
];

// 질문별 접기 목록. 하나만 열리고 같은 질문을 다시 누르면 닫힌다. 첫 질문은 열어 둔다.
// 선 대신 질문마다 모래색 칸 하나, 요금표와 같은 880px 폭
export function Faq() {
	const [open, setOpen] = useState<number | null>(0);
	return (
		<div className="mx-auto max-w-[880px]">
			<h2 className="text-[26px] font-bold tracking-tight">자주 묻는 질문</h2>
			<div className="mt-12 flex flex-col gap-2">
				{FAQ.map((item, i) => {
					const expanded = open === i;
					return (
						<div key={item.q} className="rounded-lg bg-sand-2 px-7">
							<button
								type="button"
								aria-expanded={expanded}
								aria-controls={`faq-${i}`}
								onClick={() => setOpen(expanded ? null : i)}
								className="flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-medium"
							>
								{item.q}
								<ChevronDownIcon aria-hidden className={cn('size-4 shrink-0 text-cobalt-muted transition-transform', expanded && 'rotate-180')} />
							</button>
							{expanded && (
								<p id={`faq-${i}`} className="pb-6 text-[15px] leading-relaxed text-cobalt-muted">
									{item.a}
								</p>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
