import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

// 요금 페이지의 자주 묻는 질문. 값은 plan.md 결정 11과 같다
export const FAQ = [
	{ q: '포함된 건수를 넘으면 어떻게 되나요?', a: 'Starter 플랜은 웹훅을 계속 받아 저장하되 목적지로 전달하지는 않고 보류해 둡니다. 보류된 전달은 포함량이 다시 생기면 전달 화면에서 직접 보낼 수 있고, 보존 기간 3일이 지나면 지워집니다. 보류로 받아 둔 양이 10,000건을 넘으면 그때부터는 웹훅을 받지 않고 429로 응답합니다. Pro 플랜은 초과분을 10만 건당 5,000원으로 청구하고, 1만 건 단위로 나눠 계산합니다. 사용량이 많을수록 단가가 낮아져 월 500만 건을 넘는 부분은 2,500원, 1,000만 건을 넘는 부분은 1,500원, 2,000만 건을 넘는 부분은 1,000원입니다.' },
	{ q: '플랜은 언제 바꿀 수 있나요?', a: '가입하면 Starter 플랜으로 시작합니다. 플랜 변경과 결제 기능은 준비 중입니다.' },
	{ q: '무엇을 한 건으로 세나요?', a: '웹훅을 목적지 한 곳으로 보내는 전달 한 건을 셉니다. 웹훅 하나가 목적지 세 곳으로 가면 세 건입니다. 같은 웹훅이 다시 들어오거나 재시도되는 경우, 일시 정지해 둔 연결로 들어온 경우는 세지 않습니다. 일시 정지 중에 보류된 전달을 나중에 직접 다시 보내면 그때 집계됩니다. 대시보드에서 리플레이하면 연결된 목적지 수만큼 새로 집계됩니다.' },
	{ q: '웹훅이 한꺼번에 많이 들어오면 어떻게 되나요?', a: '받는 속도에는 제한이 없어 모두 저장합니다. 목적지로는 한 곳당 초당 5건씩 보내고, 그보다 많이 쌓이면 남은 건은 잠시 뒤에 이어서 전달합니다. 기다리는 동안에는 재시도 횟수를 쓰지 않습니다.' },
	{ q: '받지 않는 웹훅도 있나요?', a: '본문이 10MB를 넘는 웹훅, 서명 검증을 켠 소스에 서명이 맞지 않게 온 웹훅, 목적지가 연결되지 않은 소스로 온 웹훅은 받지 않습니다. Starter 플랜은 포함량을 넘긴 뒤 보류된 양이 10,000건을 넘으면 그때부터 받지 않습니다. 받지 않은 사유는 거부된 요청 화면에서 확인할 수 있습니다.' },
];

// 질문별 접기 목록. 하나만 열리고 같은 질문을 다시 누르면 닫힌다. 첫 질문은 열어 둔다.
// 선 대신 질문마다 칸 하나, 요금표와 같은 880px 폭
export function Faq() {
	const [open, setOpen] = useState<number | null>(0);
	return (
		<div className="mx-auto max-w-[880px]">
			<h2 className="text-[26px] font-bold tracking-tight">자주 묻는 질문</h2>
			<div className="mt-12 flex flex-col gap-2">
				{FAQ.map((item, i) => {
					const expanded = open === i;
					return (
						<div key={item.q} className="rounded-lg bg-paper-2 px-7">
							<button
								type="button"
								aria-expanded={expanded}
								aria-controls={`faq-${i}`}
								onClick={() => setOpen(expanded ? null : i)}
								className="flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-medium"
							>
								{item.q}
								<ChevronDownIcon aria-hidden className={cn('size-4 shrink-0 text-ink-muted transition-transform', expanded && 'rotate-180')} />
							</button>
							{expanded && (
								<p id={`faq-${i}`} className="pb-6 text-[15px] leading-relaxed text-ink-muted">
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
