import { screen } from '@testing-library/react';
import { setToken } from '@/auth/token';
import { SCOPE } from '@/config';
import { renderApp } from '@/test/render';

// 공개 범위(config.ts SCOPE)별로 어느 경로가 열리고 무엇이 숨는지. all은 각 화면 테스트와 App.test가 본다
describe('공개 범위(SCOPE)', () => {
	beforeEach(() => localStorage.clear());

	it('지금 배포 설정은 로그인까지 공개다', () => {
		expect(SCOPE).toBe('login');
	});

	describe('landing', () => {
		const only = { scope: 'landing' as const };

		it('/login·/app·/invitations는 전부 랜딩으로 보낸다. 로그인돼 있어도', () => {
			for (const path of ['/login', '/pricing', '/developers', '/docs', '/app/events', '/invitations/abc']) {
				setToken('jwt');
				const { unmount } = renderApp(path, only);
				expect(screen.getByRole('heading', { level: 1, name: /웹훅을 받아 두고/ })).toBeDefined();
				expect(screen.queryByRole('button', { name: /Google 계정으로 로그인/ })).toBeNull();
				unmount();
			}
		});

		it('상단 바에 워드마크만 남고 시작 자리는 준비 중', () => {
			renderApp('/', only);
			expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
			expect(screen.queryByRole('link', { name: '시작하기' })).toBeNull();
			expect(screen.queryByRole('link', { name: '무료로 시작하기' })).toBeNull();
			// 상단 바에는 아무 표시도 없고, 본문의 시작·요금 자리만 준비 중
			expect(screen.getByRole('banner').textContent).not.toContain('준비 중');
			expect(screen.getAllByText('준비 중').length).toBeGreaterThanOrEqual(2);
			expect(screen.getByRole('button', { name: '준비 중' }).hasAttribute('disabled')).toBe(true);
			expect(screen.queryByRole('link', { name: '요금' })).toBeNull();
			expect(screen.queryByRole('link', { name: '요금 자세히 보기' })).toBeNull();
			expect(screen.queryByRole('link', { name: '문서' })).toBeNull();
			expect(screen.queryByRole('link', { name: '개발자' })).toBeNull();
		});
	});

	describe('login', () => {
		const only = { scope: 'login' as const };

		it('랜딩에 로그인·시작하기만 있고 메뉴는 없다. 요금 자리는 준비 중', () => {
			renderApp('/', only);
			expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
			expect(screen.getByRole('link', { name: '시작하기' }).getAttribute('href')).toBe('/login');
			expect(screen.getByRole('link', { name: '무료로 시작하기' }).getAttribute('href')).toBe('/login');
			expect(screen.queryByRole('link', { name: '요금' })).toBeNull();
			expect(screen.queryByRole('link', { name: '문서' })).toBeNull();
			expect(screen.queryByRole('link', { name: '요금 자세히 보기' })).toBeNull();
			expect(screen.getByRole('button', { name: '만들고 시작하기' }).hasAttribute('disabled')).toBe(false);
		});

		it('/login은 열린다. 이미 로그인돼 있으면 랜딩으로', () => {
			renderApp('/login', only);
			expect(screen.getByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();

			setToken('jwt');
			renderApp('/login', only);
			expect(screen.getByRole('heading', { level: 1, name: /웹훅을 받아 두고/ })).toBeDefined();
		});

		it('/pricing·/docs·/app·/invitations는 랜딩으로 보낸다', () => {
			for (const path of ['/pricing', '/docs', '/app/events', '/invitations/abc']) {
				const { unmount } = renderApp(path, only);
				expect(screen.getByRole('heading', { level: 1, name: /웹훅을 받아 두고/ })).toBeDefined();
				unmount();
			}
		});

		it('로그인 상태의 랜딩: 상단에 로그아웃만, 시작 자리는 준비 중. 로그아웃하면 토큰을 지우고 /login으로', async () => {
			setToken('jwt');
			renderApp('/', only);
			expect(screen.getByRole('heading', { level: 1, name: /웹훅을 받아 두고/ })).toBeDefined();
			expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
			expect(screen.queryByRole('link', { name: '무료로 시작하기' })).toBeNull();
			expect(screen.getByText(/로그인됐습니다. 대시보드가 열리면/)).toBeDefined();
			expect(screen.getByRole('button', { name: '준비 중' }).hasAttribute('disabled')).toBe(true);

			screen.getByRole('button', { name: '로그아웃' }).click();
			expect(await screen.findByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();
			expect(localStorage.getItem('munjigi.token')).toBeNull();
		});
	});
});
