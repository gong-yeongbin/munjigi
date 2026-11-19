import { cn } from 'cn';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useScope } from '@/config';
import { StatusTag } from '@/components/StatusTag';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PublicLayout, useWaiting } from '@/layout/PublicLayout';
import { EventsFragment, Panel } from './fragments';

// 설명 대신 실제 화면 조각이 일한다(context-notes "프론트 스타일 교체" 절).
// 첫 화면은 제목 + 코발트 무대 위의 이벤트 화면. 무대 왼쪽 위 모서리를 계단형으로 깎는다(이 페이지의 유일한 장식)
export function LandingPage() {
	return (
		<PublicLayout>
			<Hero />
			<Features />
			<Cta />
		</PublicLayout>
	);
}

function Hero() {
	const landingOnly = useWaiting();
	return (
		<section className="overflow-hidden">
			<div className="wrap relative min-h-[clamp(640px,90svh,900px)] pt-[110px]">
				<div className="max-w-[46%]">
					<h1 className="text-[clamp(52px,5.2vw,76px)] leading-[0.98] font-bold tracking-[-0.035em] [word-break:keep-all]">
						웹훅을 안전하게 받아
						<br />
						끝까지 전달합니다
					</h1>
					<p className="mt-7 max-w-[40ch] text-lg leading-relaxed text-ink-muted">외부 서비스가 보내는 웹훅을 munjigi가 먼저 받아 저장하고, 내 서버가 응답하지 않으면 자동으로 재시도합니다. 모든 요청이 기록되고 언제든 다시 보낼 수 있습니다.</p>
					{landingOnly ? (
						<span aria-disabled className={cn(buttonVariants({ size: 'lg' }), 'mt-8 pointer-events-none opacity-60')}>
							준비 중
						</span>
					) : (
						<Link to="/login" className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}>
							무료로 시작하기
						</Link>
					)}
				</div>
				{/* 무대. clip-path가 자식도 자르므로 화면 조각은 깎인 모서리 아래에 둔다. 글과 같은 wrap 기준으로 38%에서 시작해 내용의 오른쪽 선에서 끝나고, 아래로 넘친 40px은 section이 자른다 */}
				<div className="hero-stage absolute top-[440px] right-12 bottom-[-40px] left-[38%] bg-primary">
					<EventsFragment className="absolute top-[calc(12%+56px)] left-14" />
				</div>
			</div>
		</section>
	);
}

// 여섯 칸. 글과 화면 조각이 위아래로 엇갈려 체크무늬가 된다
const FEATURES: { title: string; body: string; fragment: ReactNode }[] = [
	{
		title: '받는 즉시 저장하고 중복은 걸러냅니다',
		body: '같은 웹훅이 두 번 들어와도 이벤트는 하나만 만듭니다. 외부 서비스가 준 이벤트 ID가 있으면 그 값으로, 없으면 요청 내용의 해시로 중복을 판단합니다.',
		fragment: (
			<Panel label="중복 처리 예시" className="w-[320px] p-4">
				<p className="text-muted-foreground">멱등 키</p>
				<p className="mt-1 break-all">id:evt_7d10c3…9e</p>
				<p className="mt-3 text-muted-foreground">같은 키로 다시 수신 → 200 응답, 새 전달 없음</p>
			</Panel>
		),
	},
	{
		title: '재시도 방식은 연결마다 설정합니다',
		body: '고정 간격과 2배씩 늘리는 방식 중에서 고르고, 간격과 횟수를 정합니다. 기본값은 5분부터 2배씩 늘려 9회, 약 1.8일 동안 시도합니다. 목적지가 Retry-After 헤더를 보내면 그 값을 우선합니다.',
		fragment: (
			<Panel label="재시도 설정 예시" className="w-[320px] p-4">
				<div className="grid grid-cols-3 gap-2 text-center">
					{[
						['방식', '2배씩'],
						['간격', '5분'],
						['횟수', '9회'],
					].map(([k, v]) => (
						<div key={k} className="rounded-md border px-2 py-2">
							<p className="text-muted-foreground">{k}</p>
							<p className="font-medium">{v}</p>
						</div>
					))}
				</div>
			</Panel>
		),
	},
	{
		title: '들어오는 서명은 검증하고, 나가는 요청에는 서명을 붙입니다',
		body: '소스마다 서명 헤더와 인코딩, 서명 대상을 설정해 두면 HMAC-SHA256으로 검증합니다. 목적지로 전달할 때는 프로젝트 서명 키로 다시 서명하므로 받는 쪽에서도 출처를 확인할 수 있습니다.',
		fragment: (
			<Panel label="서명 확인 예시" className="w-[320px] p-4">
				<pre className="text-xs leading-relaxed">
					<code>{'x-signature: t=1729…,v1=3f9a…\nx-event-id: evt_7d10c3'}</code>
				</pre>
				<p className="mt-2 flex items-center gap-2">
					서명 <StatusTag status="succeeded" />
				</p>
			</Panel>
		),
	},
	{
		title: '목적지가 불안정하면 잠시 멈춥니다',
		body: '목적지별로 동시 요청 수를 제한하고, 5회 연속 실패하면 60초 동안 전송을 멈춥니다. 연결을 일시 정지하면 그동안 들어온 웹훅은 보류해 두고, 필요한 것만 골라 직접 다시 보낼 수 있습니다.',
		fragment: (
			<Panel label="목적지 상태 예시" className="w-[320px] p-4">
				<p className="font-medium">api.shop.example</p>
				<p className="mt-1 text-bad">서킷 열림 · 58초 뒤 다시 시도</p>
				<p className="mt-1 text-muted-foreground">동시 2 / 2 · 최근 실패 5회</p>
			</Panel>
		),
	},
	{
		title: '실패한 전달은 다시 보낼 수 있습니다',
		body: '전달 한 건만 다시 시도할 수도 있고, 조건으로 골라 한 번에 최대 1,000건까지 재시도할 수도 있습니다. 이벤트를 리플레이하면 새 이벤트로 현재 연결된 모든 목적지에 전달합니다.',
		fragment: (
			<Panel label="재전송 예시" className="w-[320px] p-4">
				<div className="flex items-center gap-2">
					<span className={buttonVariants({ size: 'sm' })}>리플레이</span>
					<span className={buttonVariants({ size: 'sm', variant: 'outline' })}>다시 시도</span>
				</div>
				<p className="mt-3 text-muted-foreground">실패 10건 → 대기 상태로 변경</p>
			</Panel>
		),
	},
	{
		title: '거부된 요청도 기록합니다',
		body: '서명이 맞지 않거나 연결이 없어 받지 않은 요청도 사유와 헤더를 함께 남깁니다. 웹훅이 들어오지 않을 때 원인을 바로 확인할 수 있습니다.',
		fragment: (
			<Panel label="거부된 요청 예시" className="w-[320px]">
				{[
					['2분 전', '서명 불일치'],
					['1시간 전', '연결 없음'],
					['어제', '본문 초과'],
				].map(([at, why]) => (
					<div key={why} className="flex h-[42px] items-center gap-4 border-b px-4 last:border-0">
						<span className="text-muted-foreground">{at}</span>
						<span className="text-destructive">{why}</span>
					</div>
				))}
			</Panel>
		),
	},
];

function Features() {
	return (
		<section className="wrap pt-[160px] pb-[160px]">
			<h2 className="text-[36px] font-bold tracking-tight">주요 기능</h2>
			<div className="mt-14 grid grid-cols-3 gap-2">
				{FEATURES.map((f, i) => {
					// 첫 줄은 글·조각·글, 둘째 줄은 그 반대
					const textTop = i < 3 ? i % 2 === 0 : i % 2 === 1;
					return (
						<div key={f.title} className="relative h-[320px] overflow-hidden rounded-lg bg-paper-2">
							<div className={cn('absolute inset-x-0 p-6', textTop ? 'top-0' : 'bottom-0')}>
								<h3 className="text-[17px] font-medium">{f.title}</h3>
								<p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{f.body}</p>
							</div>
							<div className={cn('absolute right-[-24px]', textTop ? 'bottom-[-12px]' : 'top-[-12px]')}>{f.fragment}</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}


// 제목·설명 아래 폼 카드, 전부 가운데 정렬. 섹션 높이는 내용 + 위아래 160px
function Cta() {
	const scope = useScope();
	const landingOnly = useWaiting();
	const navigate = useNavigate();
	const [name, setName] = useState('shop');
	return (
		<section className="bg-primary text-paper">
			<div className="wrap flex flex-col items-center py-[160px] text-center">
				<div>
					<p className="text-[clamp(48px,6vw,86px)] leading-[0.92] font-bold tracking-[-0.035em] whitespace-nowrap">
						프로젝트 하나로 시작합니다
					</p>
					<p className="mt-6 text-[17px] text-paper/80">
						{scope === 'landing' ? '곧 열립니다. 오픈 후에는 구글 계정으로 바로 로그인할 수 있습니다.' : landingOnly ? '로그인되었습니다. 대시보드가 열리면 이 계정으로 바로 이용할 수 있습니다.' : '구글 계정으로 로그인하면 바로 시작할 수 있습니다. 카드 등록은 필요 없습니다.'}
					</p>
				</div>
				<form
					data-ui
					className="mt-12 w-[440px] rounded-lg text-left bg-card p-6 text-card-foreground shadow-lg"
					onSubmit={(e) => {
						e.preventDefault();
						void navigate(`/login?project=${encodeURIComponent(name.trim())}`);
					}}
				>
					<h2 className="text-lg font-semibold">새 프로젝트</h2>
					<label htmlFor="landing-project-name" className="mt-5 block text-sm font-medium">
						이름
					</label>
					<Input id="landing-project-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-9" />
					<Button type="submit" size="lg" className="mt-5 w-full" disabled={landingOnly || !name.trim()}>
						{landingOnly ? '준비 중' : '만들고 시작하기'}
					</Button>
				</form>
			</div>
		</section>
	);
}
