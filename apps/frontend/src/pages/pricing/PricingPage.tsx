import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Faq } from './Faq';
import { buttonVariants } from '@/components/ui/button';
import { PublicLayout, useWaiting } from '@/layout/PublicLayout';

// 값은 plan.md 결정 11과 백엔드 plan-limits.ts와 같다. 바꾸면 셋을 같이 바꾼다.
// 초과 단가의 구간 할인(500만 건 이후)과 1만 건 단위 계산은 카드에 안 적고 FAQ 첫 답에 적는다
// business는 team과 보존일만 달라 요금표에서 뺐다. 차별화는 billing 때 정한다
const PLANS = [
	{ name: 'Starter', price: '0원', featured: false, rows: ['월 10,000건 전달', '초과하면 전달 보류', '프로젝트 1개', '소스·목적지 각 3개', '목적지당 초당 5건 전달', '보존 3일'] },
	{ name: 'Pro', price: '49,900원', featured: true, rows: ['월 10,000건 전달', '초과분 10만 건당 5,000원부터', '프로젝트 무제한', '소스·목적지 무제한', '목적지당 초당 5건 전달', '보존 7일'] },
];

// 플랜과 무관하게 전부 들어 있는 것
const INCLUDED = ['자동 재시도', '서명 검증', '대시보드에서 재전송', '내부망 주소 차단'];

// 시작하기는 랜딩과 같은 규칙. 로그인했지만 대시보드가 안 열렸으면 준비 중
export function PricingPage() {
	const landingOnly = useWaiting();
	return (
		<PublicLayout>
			<section className="wrap pt-[110px]">
				{/* 880px 열을 가운데에. 글은 열 안에서 왼쪽 정렬 */}
				<div className="mx-auto max-w-[880px]">
					<h1 className="text-[40px] font-bold tracking-tight">요금</h1>
					<p className="mt-4 text-lg text-cobalt-muted">월 요금에 포함된 전달 건수를 넘으면 사용한 만큼만 추가로 과금됩니다.</p>

					{/* 선 없이 칸 둘. Team은 랜딩의 코발트 블록과 같은 색 */}
					<div className="mt-12 grid grid-cols-2 gap-2">
						{PLANS.map((plan) => (
							<div key={plan.name} className={cn('rounded-lg p-7', plan.featured ? 'bg-primary text-sand' : 'bg-sand-2')}>
								<p className={cn('text-[15px] font-semibold', plan.featured ? 'text-sand/70' : 'text-cobalt-muted')}>{plan.name}</p>
								<p className="mt-2">
									<span className="text-[32px] font-bold tracking-tight">{plan.price}</span>
									<span className={cn('ml-1 text-sm', plan.featured ? 'text-sand/70' : 'text-cobalt-muted')}>/ 월</span>
								</p>
								<ul className="mt-6 m-0 list-none space-y-2.5 p-0 text-[15px]">
									{plan.rows.map((row) => (
										<li key={row}>{row}</li>
									))}
								</ul>
								{landingOnly ? (
									<span aria-disabled className={cn(buttonVariants({ size: 'lg' }), 'mt-7 w-full pointer-events-none opacity-60', plan.featured && 'bg-sand text-primary')}>
										준비 중
									</span>
								) : (
									<Link to="/login" className={cn(buttonVariants({ size: 'lg' }), 'mt-7 w-full', plan.featured && 'bg-sand text-primary hover:bg-sand-2')}>
										시작하기
									</Link>
								)}
							</div>
						))}
					</div>

					<div className="mt-2 rounded-lg bg-sand-2 px-6 py-4">
						<p className="text-[13px] text-cobalt-muted">모든 플랜 공통</p>
						<div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
							{INCLUDED.map((item) => (
								<p key={item} className="flex items-center gap-2">
									<CheckIcon aria-hidden className="size-4" />
									{item}
								</p>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="wrap pt-[160px] pb-[160px]">
				<Faq />
			</section>
		</PublicLayout>
	);
}
