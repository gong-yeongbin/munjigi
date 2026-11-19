// 문서 네 장의 본문. 수치는 백엔드 코드에서 옮긴 것이라 바꾸면 같이 고친다(근거는 context-notes.md "문서 페이지")
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router';

// 본문 조각. 선·아이콘 없이 글과 칸(paper-2)만 쓴다
// 절 제목. id는 오른쪽 "이 장의 내용"이 가리키는 닻이다
const H = ({ id, children }: { id: string; children: string }) => (
	<h2 id={id} className="mt-14 scroll-mt-8 text-[22px] font-bold tracking-tight">
		{children}
	</h2>
);
const P = ({ children }: { children: ReactNode }) => <p className="mt-4 leading-relaxed">{children}</p>;
const C = ({ children }: { children: ReactNode }) => <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[13px]">{children}</code>;
const List = ({ items }: { items: ReactNode[] }) => (
	<ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
		{items.map((item, i) => (
			<li key={i}>{item}</li>
		))}
	</ul>
);
const Steps = ({ items }: { items: ReactNode[] }) => (
	<ol className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed">
		{items.map((item, i) => (
			<li key={i}>{item}</li>
		))}
	</ol>
);
const Code = ({ label, children }: { label: string; children: string }) => (
	<pre aria-label={label} className="mt-4 overflow-x-auto rounded-lg bg-paper-2 p-5 font-mono text-[13px] leading-relaxed">
		<code>{children}</code>
	</pre>
);
// 이름과 설명이 짝인 목록. 헤더·응답 코드·상태처럼 찾아보는 내용에 쓴다
const Rows = ({ label, rows }: { label: string; rows: [string, ReactNode][] }) => (
	<dl aria-label={label} className="mt-4 flex flex-col gap-1">
		{rows.map(([name, description]) => (
			<div key={name} className="grid grid-cols-[230px_1fr] gap-4 rounded-md bg-paper-2 px-4 py-2.5 text-[15px]">
				<dt className="font-mono text-[13px] leading-6">{name}</dt>
				<dd className="leading-6">{description}</dd>
			</div>
		))}
	</dl>
);

// 왼쪽에서 오른쪽으로 읽는 흐름 그림. 칸 사이는 화살표 글자 하나
const Flow = ({ label, steps }: { label: string; steps: [string, string][] }) => (
	<ol aria-label={label} className="mt-10 flex items-stretch gap-2">
		{steps.map(([name, description], i) => (
			<li key={name} className="flex min-w-0 flex-1 items-center gap-2">
				<div className="h-full flex-1 rounded-lg bg-paper-2 px-4 py-4">
					<p className="text-[15px] font-semibold">{name}</p>
					<p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{description}</p>
				</div>
				{i < steps.length - 1 && (
					<span aria-hidden className="text-ink-muted">
						→
					</span>
				)}
			</li>
		))}
	</ol>
);

const VERIFY_EXAMPLE =`import { createHmac, timingSafeEqual } from 'node:crypto';
import express from 'express';

const app = express();

// 서명은 받은 바이트 그대로 계산한다. JSON으로 바꾸기 전의 본문을 받는다
app.post('/webhooks', express.raw({ type: '*/*' }), (req, res) => {
  const expected = createHmac('sha256', process.env.MUNJIGI_SIGNING_KEY)
    .update(req.body)
    .digest();
  const received = Buffer.from(req.get('x-munjigi-signature') ?? '', 'base64');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return res.sendStatus(401);
  }

  // 같은 전달이 두 번 올 수 있다. 이벤트 ID로 이미 처리했는지 확인한다
  const eventId = req.get('x-munjigi-event-id');
  const payload = JSON.parse(req.body);

  res.sendStatus(200);
});`;

// hint는 목차에서 장 이름 아래에 붙는 한 줄, lead는 본문 첫머리의 소개
export type Chapter = { slug: string; title: string; hint: string; lead: string; body: ReactNode };

export const CHAPTERS: Chapter[] = [
	{
		slug: 'start',
		title: '시작하기',
		hint: '처음 연결하고 시험하기',
		lead: '소스와 목적지를 만들어 연결하면, 소스의 수신 주소로 들어온 웹훅이 목적지로 전달됩니다.',
		body: (
			<>
				<Flow
					label="웹훅이 지나는 길"
					steps={[
						['외부 서비스', '결제사, GitHub 등이 웹훅을 보냅니다'],
						['소스', '수신 주소로 받아 그대로 저장합니다'],
						['연결', '재시도 규칙에 따라 전달합니다'],
						['목적지', '내 서버가 2xx로 응답하면 끝납니다'],
					]}
				/>

				<H id="prepare">준비</H>
				<P>구글 계정으로 로그인하면 계정이 만들어집니다. 대시보드 위쪽의 프로젝트 메뉴에서 새 프로젝트를 하나 만듭니다. 소스, 목적지, 이벤트는 모두 프로젝트 안에 속합니다.</P>

				<H id="connect">연결 만들기</H>
				<Steps
					items={[
						<>
							<strong>목적지를 만듭니다.</strong> 웹훅을 받을 내 서버의 주소를 적습니다. 인증 토큰처럼 매번 붙여 보낼 헤더가 있으면 함께 넣습니다.
						</>,
						<>
							<strong>소스를 만듭니다.</strong> 이름을 정하면 수신 주소가 발급됩니다. 주소의 마지막 20자는 추측할 수 없는 값입니다.
						</>,
						<>
							<strong>둘을 연결합니다.</strong> 연결 화면에서 소스와 목적지를 고릅니다. 소스 하나를 목적지 여러 곳에 연결할 수 있습니다.
						</>,
						<>
							<strong>수신 주소를 등록합니다.</strong> 결제사나 GitHub 같은 외부 서비스의 웹훅 설정에 수신 주소를 넣습니다.
						</>,
					]}
				/>
				<Code label="수신 주소 예시">{'https://munjigi.dev/api/in/k3v9x0q2m7c1b8n4t6z5'}</Code>

				<H id="try">시험해 보기</H>
				<P>수신 주소로 요청을 하나 보내 봅니다.</P>
				<Code label="시험 요청 예시">{`curl -X POST https://munjigi.dev/api/in/k3v9x0q2m7c1b8n4t6z5 \\
  -H 'Content-Type: application/json' \\
  -d '{"order": 1}'

{"id":"1284"}`}</Code>
				<P>
					응답의 <C>id</C>는 저장된 이벤트의 번호입니다. 이벤트 화면에서 받은 내용을, 전달 화면에서 목적지로 보낸 결과를 확인할 수 있습니다. 목적지가 2xx로 응답하면 성공으로 표시됩니다.
				</P>
			</>
		),
	},
	{
		slug: 'receive',
		title: '웹훅 받기',
		hint: '수신 주소와 서명 검증',
		lead: 'munjigi가 외부 서비스의 웹훅을 받는 규칙입니다. 받은 요청은 본문을 바이트 그대로 저장합니다.',
		body: (
			<>
				<H id="address">수신 주소</H>
				<List
					items={[
						<>
							요청 방식은 <C>POST</C>, <C>PUT</C>, <C>PATCH</C>, <C>DELETE</C>를 받습니다.
						</>,
						'본문은 10MB까지 받습니다.',
						<>
							받으면 <C>200</C>과 함께 이벤트 번호를 돌려줍니다. 전달은 그 뒤에 따로 진행됩니다.
						</>,
						<>
							수신 주소 뒤에 붙인 경로와 쿼리는 목적지로 그대로 넘어갑니다. <C>/in/주소/orders/42?v=2</C>로 받으면 목적지 주소 뒤에 <C>/orders/42?v=2</C>를 붙여 보냅니다. 목적지 주소에 쿼리가 이미 있으면 그쪽을 씁니다.
						</>,
					]}
				/>

				<H id="signature">서명 검증</H>
				<P>외부 서비스가 웹훅에 서명을 붙여 보낸다면, 소스에 시크릿과 검증 설정을 넣어 두면 서명이 맞는 요청만 받습니다. 방식은 HMAC-SHA256입니다.</P>
				<Rows
					label="서명 검증 설정"
					rows={[
						['서명 헤더', '서명이 담겨 오는 헤더 이름입니다.'],
						['인코딩', '서명 값의 표기입니다. hex 또는 base64.'],
						['시크릿 인코딩', '시크릿을 글자 그대로 쓸지, base64로 풀어서 쓸지 정합니다.'],
						['접두사', <>서명 값 앞에 붙는 글자입니다. GitHub는 <C>sha256=</C>입니다.</>],
						[
							'서명 대상',
							<>
								무엇을 서명했는지 적습니다. <C>{'{body}'}</C>는 본문, <C>{'{header:이름}'}</C>은 그 헤더의 값입니다.
							</>,
						],
						['시각 헤더', '요청 시각이 담긴 헤더입니다. 넣으면 허용 오차(기본 300초)를 벗어난 요청을 거부합니다.'],
						['이벤트 ID 헤더', '중복을 가려낼 때 쓸 헤더입니다.'],
					]}
				/>
				<P>자주 쓰는 설정 두 가지입니다.</P>
				<Code label="GitHub 서명 설정 예시">{`GitHub
서명 헤더        x-hub-signature-256
인코딩          hex
접두사          sha256=
서명 대상        {body}
이벤트 ID 헤더   x-github-delivery`}</Code>
				<Code label="Standard Webhooks 서명 설정 예시">{`Standard Webhooks (포트원 V2, Svix 등)
서명 헤더        webhook-signature
인코딩          base64
시크릿 인코딩    base64
접두사          v1,
서명 대상        {header:webhook-id}.{header:webhook-timestamp}.{body}
시각 헤더        webhook-timestamp
이벤트 ID 헤더   webhook-id`}</Code>

				<H id="duplicates">중복 처리</H>
				<P>
					같은 웹훅이 다시 들어오면 새로 저장하지 않고 처음 저장한 이벤트의 번호를 <C>200</C>으로 돌려줍니다. 전달도 다시 하지 않고 사용량에도 넣지 않습니다. 이벤트 ID 헤더를 설정했으면 그 값으로, 아니면 요청 방식, 경로, 쿼리, 본문을 합친 해시로 같은 웹훅인지 판단합니다.
				</P>

				<H id="rejected">받지 않는 경우</H>
				<Rows
					label="수신 오류 응답"
					rows={[
						['401 invalid_signature', '서명이 없거나 맞지 않거나, 요청 시각이 허용 오차를 벗어났습니다.'],
						['404 source_not_found', '없는 수신 주소입니다. 주소를 다시 발급하면 옛 주소도 이렇게 됩니다.'],
						['405 method_not_allowed', '받지 않는 요청 방식입니다.'],
						['409 no_connection', '소스에 연결된 목적지가 없습니다.'],
						['413 payload_too_large', '본문이 10MB를 넘었습니다.'],
						['429 usage_exceeded', 'Starter 플랜에서 포함량을 넘긴 뒤 보류된 양이 10,000건을 넘었습니다.'],
					]}
				/>
				<P>주소를 찾을 수 있는 요청은 받지 않은 사유를 이벤트 화면의 거부된 요청 탭에 남깁니다.</P>
			</>
		),
	},
	{
		slug: 'deliver',
		title: '전달받기',
		hint: '헤더, 서명 확인, 응답 규칙',
		lead: '목적지 서버가 munjigi의 전달을 받을 때 알아야 할 규칙입니다.',
		body: (
			<>
				<H id="request">전달 요청</H>
				<P>받은 요청의 방식, 경로, 쿼리, 본문을 그대로 목적지로 보냅니다. 헤더는 세 가지가 합쳐지고, 이름이 겹치면 뒤의 것이 우선합니다.</P>
				<Steps items={['외부 서비스가 보낸 헤더', '목적지에 설정해 둔 헤더', 'munjigi가 붙이는 헤더']} />

				<H id="headers">munjigi가 붙이는 헤더</H>
				<Rows
					label="전달 헤더"
					rows={[
						['x-munjigi-event-id', '이벤트 번호입니다. 같은 웹훅은 재시도해도 같은 값입니다.'],
						['x-munjigi-delivery-id', '이 목적지로 가는 전달의 번호입니다.'],
						['x-munjigi-attempt-count', '몇 번째 시도인지입니다. 1부터 셉니다.'],
						[
							'x-munjigi-attempt-trigger',
							<>
								이번 시도가 생긴 이유입니다. <C>initial</C> 첫 시도, <C>automatic</C> 자동 재시도, <C>manual</C> 직접 재시도, <C>bulk_retry</C> 일괄 재시도.
							</>,
						],
						['x-munjigi-will-retry-after', '이번에 실패하면 몇 초 뒤에 다시 보낼지입니다. 마지막 시도에는 없습니다.'],
						['x-munjigi-event-url', '대시보드에서 이 이벤트를 여는 주소입니다.'],
						['x-munjigi-source-name', '소스 이름입니다. URL 인코딩되어 있습니다.'],
						['x-munjigi-destination-name', '목적지 이름입니다. URL 인코딩되어 있습니다.'],
						['x-munjigi-original-ip', '웹훅을 처음 보낸 쪽의 IP입니다.'],
						['x-munjigi-signature', '본문을 프로젝트 서명 키로 서명한 값입니다.'],
						['x-munjigi-verified', '받을 때 외부 서비스의 서명을 확인했으면 true입니다.'],
					]}
				/>

				<H id="verify">서명 확인하기</H>
				<P>
					<C>x-munjigi-signature</C>는 본문을 프로젝트 서명 키로 계산한 HMAC-SHA256을 base64로 적은 값입니다. 목적지 서버에서 같은 방법으로 계산해 비교하면 munjigi가 보낸 요청만 받을 수 있습니다. 서명 키는 프로젝트 설정에서 확인하고 교체합니다.
				</P>
				<Code label="서명 확인 예제">{VERIFY_EXAMPLE}</Code>

				<H id="response">응답</H>
				<List
					items={[
						<>
							<C>2xx</C>만 성공입니다. 리다이렉트를 포함한 나머지 응답은 실패로 보고 재시도합니다.
						</>,
						'타임아웃 안에 응답해야 합니다. 기본 5초이고 목적지마다 1초에서 30초 사이로 정합니다. 오래 걸리는 일은 먼저 200으로 응답한 뒤에 처리하세요.',
						<>
							잠시 받을 수 없을 때는 <C>Retry-After</C> 헤더로 다시 보낼 시각을 알려 주면 그 값을 따릅니다.
						</>,
						'응답 본문은 앞 4KB까지 전달 기록에 남습니다.',
					]}
				/>

				<H id="ordering">중복과 순서</H>
				<List
					items={[
						<>
							같은 전달이 두 번 도착할 수 있습니다. <C>x-munjigi-event-id</C>로 이미 처리한 이벤트인지 확인하세요.
						</>,
						'도착 순서는 보장하지 않습니다. 재시도가 끼면 나중에 받은 웹훅이 먼저 전달될 수 있습니다.',
					]}
				/>
			</>
		),
	},
	{
		slug: 'retry',
		title: '재시도와 보류',
		hint: '실패했거나 밀린 전달 다루기',
		lead: '전달이 실패하거나 밀렸을 때 munjigi가 하는 일과, 직접 다시 보내는 방법입니다.',
		body: (
			<>
				<H id="auto">자동 재시도</H>
				<P>재시도 방식은 연결마다 정합니다.</P>
				<List
					items={[
						'방식은 매번 같은 간격과, 매번 2배로 늘리는 방식 중에서 고릅니다.',
						'간격은 1초에서 24시간, 횟수는 0회에서 50회까지 정할 수 있습니다.',
						'기본값은 5분부터 2배씩 9회이고, 약 1.8일 동안 시도합니다.',
						'한꺼번에 몰리지 않도록 간격을 ±20% 범위에서 흩뜨립니다.',
						'횟수가 남아 있어도 첫 시도로부터 1주일이 지나면 멈춥니다.',
					]}
				/>
				<P>재시도를 다 쓰면 전달은 실패 상태로 남습니다. 지우지 않으므로 나중에 직접 다시 보낼 수 있습니다.</P>

				<H id="protect">목적지 보호</H>
				<List
					items={[
						'목적지 한 곳으로는 초당 5건까지 보냅니다. 넘는 전달은 잠시 뒤에 이어서 보냅니다.',
						'목적지마다 동시 요청 수를 정할 수 있습니다. 기본 10개입니다.',
						'목적지가 5회 연속 실패하면 60초 동안 보내지 않습니다. 그 뒤 한 건을 보내 보고 성공하면 다시 보내기 시작합니다.',
					]}
				/>
				<P>이렇게 기다리는 동안에는 재시도 횟수를 쓰지 않습니다.</P>

				<H id="status">전달 상태</H>
				<Rows
					label="전달 상태"
					rows={[
						['대기', '보낼 차례를 기다리거나 보내는 중입니다.'],
						['성공', '목적지가 2xx로 응답했습니다.'],
						['재시도 대기', '실패했고 다음 재시도 시각이 잡혀 있습니다.'],
						['실패', '재시도를 다 썼습니다.'],
						['취소', '직접 취소했거나 연결이나 목적지가 지워졌습니다.'],
						['보류', '일시 정지나 포함량 초과로 보내지 않고 두었습니다.'],
					]}
				/>

				<H id="resend">직접 다시 보내기</H>
				<List
					items={[
						<>
							<strong>재시도.</strong> 전달 한 건을 지금 다시 보냅니다. 시도 횟수는 이어지고, 성공한 것도 다시 보낼 수 있습니다.
						</>,
						<>
							<strong>일괄 재시도.</strong> 상태, 목적지, 기간으로 골라 한 번에 최대 1,000건을 다시 보냅니다.
						</>,
						<>
							<strong>리플레이.</strong> 이벤트를 새 이벤트로 다시 만들어 지금 연결된 모든 목적지로 보냅니다.
						</>,
					]}
				/>

				<H id="pause">일시 정지</H>
				<P>연결을 일시 정지하면 그동안 들어온 웹훅은 저장만 하고 전달은 보류합니다. 재개하면 그 뒤에 들어오는 웹훅부터 전달합니다. 보류된 전달은 저절로 나가지 않으므로, 필요한 것을 전달 화면에서 재시도나 일괄 재시도로 직접 보냅니다. 연결이 정지된 동안에는 보류된 전달을 보낼 수 없습니다.</P>

				<H id="quota">포함량을 넘겼을 때</H>
				<P>
					Starter 플랜은 그 달의 포함량을 다 쓰면 웹훅을 계속 받아 저장하되 전달은 보류합니다. 보류된 전달은 포함량이 다시 생기면 직접 보낼 수 있고, 보존 기간이 지나면 지워집니다. 무엇을 한 건으로 세는지와 플랜별 한도는 <Link to="/pricing" className="underline underline-offset-4">요금</Link> 페이지에 있습니다.
				</P>
			</>
		),
	},
];

// 장 본문에서 절 제목(H)만 뽑는다. 목차를 따로 적지 않아 본문과 어긋날 일이 없다
export function sectionsOf(chapter: Chapter): { id: string; title: string }[] {
	const body = chapter.body as ReactElement<{ children: ReactNode }>;
	return Children.toArray(body.props.children)
		.filter((node): node is ReactElement<{ id: string; children: string }> => isValidElement(node) && node.type === H)
		.map((node) => ({ id: node.props.id, title: node.props.children }));
}
