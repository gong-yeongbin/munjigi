// 문서 화면 테스트. 장 이동, 없는 장 처리, 목차·이 장의 내용·앞뒤 장, 공개 범위별 안내를 본다
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CHAPTERS, sectionsOf } from './chapters';
import { renderApp } from '@/test/render';

const toc = () => within(screen.getByRole('navigation', { name: '문서 목차' }));

describe('DocsPage', () => {
	beforeEach(() => localStorage.clear());

	it('/docs와 없는 장은 첫 장(시작하기)으로 보낸다', () => {
		for (const path of ['/docs', '/docs/nothing']) {
			const { unmount } = renderApp(path);
			expect(screen.getByRole('heading', { level: 1, name: '시작하기' })).toBeDefined();
			unmount();
		}
	});

	it('목차에 네 장이 한 줄 설명과 함께 있고 지금 장을 표시한다. 상단 메뉴의 문서도 굵게', () => {
		renderApp('/docs/start');
		expect(
			toc()
				.getAllByRole('link')
				.map((a) => a.getAttribute('href'))
		).toEqual(['/docs/start', '/docs/receive', '/docs/deliver', '/docs/retry']);
		const first = toc().getByRole('link', { name: /^시작하기/ });
		expect(first.textContent).toContain('처음 연결하고 시험하기');
		expect(first.getAttribute('aria-current')).toBe('page');
		expect(toc().getByRole('link', { name: /^전달받기/ }).getAttribute('aria-current')).toBeNull();
		expect(within(screen.getByRole('banner')).getByRole('link', { name: '문서' }).className).toContain('font-semibold');
	});

	it('목차를 누르면 그 장의 제목과 본문으로 바뀌고 맨 위에서 시작한다', async () => {
		const u = userEvent.setup();
		renderApp('/docs/start');
		expect(screen.getByLabelText('시험 요청 예시').textContent).toContain('curl -X POST https://munjigi.dev/api/in/');
		expect(within(screen.getByLabelText('웹훅이 지나는 길')).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)).toEqual(['외부 서비스', '소스', '연결', '목적지']);

		document.documentElement.scrollTop = 500;
		await u.click(toc().getByRole('link', { name: /^전달받기/ }));
		expect(screen.getByRole('heading', { level: 1, name: '전달받기' })).toBeDefined();
		expect(screen.queryByLabelText('시험 요청 예시')).toBeNull();
		expect(document.documentElement.scrollTop).toBe(0);
	});

	it('이 장의 내용 — 본문의 절 제목과 같은 순서로 닻 링크를 둔다', () => {
		for (const chapter of CHAPTERS) {
			const { unmount } = renderApp(`/docs/${chapter.slug}`);
			const headings = within(screen.getByRole('article')).getAllByRole('heading', { level: 2 });
			const links = within(screen.getByRole('navigation', { name: '이 장의 내용' })).getAllByRole('link');
			expect(links.map((a) => a.textContent)).toEqual(headings.map((h) => h.textContent));
			expect(links.map((a) => a.getAttribute('href'))).toEqual(headings.map((h) => `#${h.id}`));
			expect(sectionsOf(chapter).length).toBeGreaterThanOrEqual(3);
			unmount();
		}
	});

	it('앞뒤 장 — 첫 장은 다음만, 가운데 장은 둘 다, 마지막 장은 이전만', () => {
		const steps = () =>
			within(screen.getByRole('navigation', { name: '앞뒤 장' }))
				.getAllByRole('link')
				.map((a) => [a.textContent, a.getAttribute('href')]);

		const first = renderApp('/docs/start');
		expect(steps()).toEqual([['다음웹훅 받기', '/docs/receive']]);
		first.unmount();

		const middle = renderApp('/docs/receive');
		expect(steps()).toEqual([
			['이전시작하기', '/docs/start'],
			['다음전달받기', '/docs/deliver'],
		]);
		middle.unmount();

		renderApp('/docs/retry');
		expect(steps()).toEqual([['이전전달받기', '/docs/deliver']]);
	});

	it('웹훅 받기 — 서명 설정 항목, 서비스별 예시, 받지 않는 경우의 응답 코드', () => {
		renderApp('/docs/receive');
		expect(within(screen.getByLabelText('서명 검증 설정')).getAllByRole('term').map((t) => t.textContent)).toEqual(['서명 헤더', '인코딩', '시크릿 인코딩', '접두사', '서명 대상', '시각 헤더', '이벤트 ID 헤더']);
		expect(screen.getByLabelText('GitHub 서명 설정 예시').textContent).toContain('x-hub-signature-256');
		expect(screen.getByLabelText('Standard Webhooks 서명 설정 예시').textContent).toContain('{header:webhook-id}.{header:webhook-timestamp}.{body}');
		expect(within(screen.getByLabelText('수신 오류 응답')).getAllByRole('term').map((t) => t.textContent)).toEqual([
			'401 invalid_signature',
			'404 source_not_found',
			'405 method_not_allowed',
			'409 no_connection',
			'413 payload_too_large',
			'429 usage_exceeded',
		]);
	});

	it('전달받기 — munjigi가 붙이는 헤더 11개와 서명 확인 예제', () => {
		renderApp('/docs/deliver');
		const headers = within(screen.getByLabelText('전달 헤더')).getAllByRole('term').map((t) => t.textContent);
		expect(headers).toHaveLength(11);
		expect(headers).toEqual(expect.arrayContaining(['x-munjigi-event-id', 'x-munjigi-attempt-count', 'x-munjigi-signature', 'x-munjigi-verified']));
		const example = screen.getByLabelText('서명 확인 예제').textContent;
		expect(example).toContain("createHmac('sha256', process.env.MUNJIGI_SIGNING_KEY)");
		expect(example).toContain("'base64'");
	});

	it('재시도와 보류 — 전달 상태 여섯 가지, 초당 5건, 요금으로 가는 링크', () => {
		renderApp('/docs/retry');
		expect(within(screen.getByLabelText('전달 상태')).getAllByRole('term').map((t) => t.textContent)).toEqual(['대기', '성공', '재시도 대기', '실패', '취소', '보류']);
		expect(screen.getByText(/목적지 한 곳으로는 초당 5건까지 보냅니다/)).toBeDefined();
		expect(screen.getByText(/재개하면 그 뒤에 들어오는 웹훅부터 전달합니다/)).toBeDefined();
		expect(within(screen.getByRole('article')).getByRole('link', { name: '요금' }).getAttribute('href')).toBe('/pricing');
	});

	it('대시보드가 닫힌 범위(login)에서는 준비 중 안내를 보여 주고, 전부 연 범위에서는 없다', () => {
		const { unmount } = renderApp('/docs/start', { scope: 'login' });
		expect(screen.getByText(/대시보드는 아직 준비 중입니다/)).toBeDefined();
		unmount();

		renderApp('/docs/start');
		expect(screen.queryByText(/대시보드는 아직 준비 중입니다/)).toBeNull();
	});

	it('장마다 주소가 겹치지 않는다', () => {
		expect(new Set(CHAPTERS.map((c) => c.slug)).size).toBe(CHAPTERS.length);
	});
});
