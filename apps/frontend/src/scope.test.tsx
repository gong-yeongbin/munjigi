import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { SCOPE } from '@/config';
import { ME, server } from '@/test/msw';
import { renderApp } from '@/test/render';

// 공개 범위(config.ts SCOPE)별로 어느 경로가 열리고 무엇이 숨는지. all은 각 화면 테스트와 App.test가 본다
describe('공개 범위(SCOPE)', () => {
	beforeEach(() => localStorage.clear());

	it('지금 배포 설정은 관리자에게만 대시보드를 연다', () => {
		expect(SCOPE).toBe('admin');
	});

	describe('landing', () => {
		const only = { scope: 'landing' as const };

		it('/login·/app·/invitations는 전부 랜딩으로 보낸다. 로그인돼 있어도', () => {
			for (const path of ['/login', '/pricing', '/developers', '/docs', '/app/events', '/invitations/abc']) {
				setToken('jwt');
				const { unmount } = renderApp(path, only);
				expect(screen.getByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
				expect(screen.queryByRole('button', { name: /Google 계정으로 로그인/ })).toBeNull();
				unmount();
			}
		});

		it('상단 바에 워드마크만 남고 시작 자리는 준비 중', () => {
			renderApp('/', only);
			expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
			expect(screen.queryByRole('link', { name: '시작하기' })).toBeNull();
			expect(screen.queryByRole('link', { name: '무료로 시작하기' })).toBeNull();
			// 상단 바에는 아무 표시도 없고, 본문의 시작 자리(히어로·CTA)만 준비 중
			expect(screen.getByRole('banner').textContent).not.toContain('준비 중');
			expect(screen.getAllByText('준비 중').length).toBeGreaterThanOrEqual(2);
			expect(screen.getByRole('button', { name: '준비 중' }).hasAttribute('disabled')).toBe(true);
			expect(screen.queryByRole('link', { name: '요금' })).toBeNull();
			expect(screen.queryByRole('link', { name: '문서' })).toBeNull();
			expect(screen.queryByRole('link', { name: '개발자' })).toBeNull();
		});
	});

	describe('admin', () => {
		const only = { scope: 'admin' as const };

		it('로그인 전에는 login 범위와 같다. /app은 랜딩으로, /login은 열린다', () => {
			const app = renderApp('/app/events', only);
			expect(screen.getByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
			expect(screen.getByRole('link', { name: '로그인' })).toBeDefined();
			app.unmount();
			renderApp('/login', only);
			expect(screen.getByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();
		});

		it('관리자가 아니면 로그인해도 /app은 랜딩으로, 대시보드 항목은 비활성', async () => {
			setToken('jwt');
			renderApp('/app/events', only);
			expect(await screen.findByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
			expect(screen.getByRole('button', { name: '준비 중' }).hasAttribute('disabled')).toBe(true);
			await userEvent.setup().click(screen.getByRole('button', { name: '내 계정' }));
			expect((await screen.findByRole('menuitem', { name: '대시보드' })).getAttribute('aria-disabled')).toBe('true');
		});

		it('관리자는 대시보드가 열린다. 랜딩의 프로필 메뉴에서도 들어간다', async () => {
			server.use(http.get('/api/users/me', () => HttpResponse.json({ ...ME, is_admin: true })));
			setToken('jwt');
			const app = renderApp('/app/events', only);
			expect((await screen.findByRole('link', { name: '이벤트' })).getAttribute('aria-current')).toBe('page');
			app.unmount();

			renderApp('/', only);
			const u = userEvent.setup();
			await u.click(await screen.findByRole('button', { name: '내 계정' }));
			await u.click(await screen.findByRole('menuitem', { name: '대시보드' }));
			expect((await screen.findByRole('link', { name: '이벤트' })).getAttribute('aria-current')).toBe('page');
		});

		it('내 정보를 못 읽으면 닫힌 쪽으로 둔다', async () => {
			server.use(http.get('/api/users/me', () => HttpResponse.json({ code: 'internal', message: '오류' }, { status: 500 })));
			setToken('jwt');
			renderApp('/app/events', only);
			expect(await screen.findByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
		});
	});

	describe('all', () => {
		it('로그인 상태의 공개 화면: 로그인·시작하기 대신 프로필 메뉴. 대시보드를 누르면 이벤트 화면으로', async () => {
			setToken('jwt');
			renderApp('/pricing');
			expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
			const u = userEvent.setup();
			await u.click(screen.getByRole('button', { name: '내 계정' }));
			const items = await screen.findAllByRole('menuitem');
			expect(items.map((m) => m.getAttribute('aria-disabled'))).toEqual([null, null]);
			await u.click(screen.getByRole('menuitem', { name: '대시보드' }));
			expect((await screen.findByRole('link', { name: '이벤트' })).getAttribute('aria-current')).toBe('page');
		});
	});

	describe('login', () => {
		const only = { scope: 'login' as const };

		it('랜딩 상단에 문서·요금·로그인·시작하기. 개발자 메뉴는 없다', () => {
			renderApp('/', only);
			expect(screen.getByRole('link', { name: '요금' }).getAttribute('href')).toBe('/pricing');
			expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
			expect(screen.getByRole('link', { name: '시작하기' }).getAttribute('href')).toBe('/login');
			expect(screen.getByRole('link', { name: '무료로 시작하기' }).getAttribute('href')).toBe('/login');
			expect(screen.getByRole('link', { name: '문서' }).getAttribute('href')).toBe('/docs');
			expect(screen.queryByRole('link', { name: '개발자' })).toBeNull();
			expect(screen.getByRole('button', { name: '만들고 시작하기' }).hasAttribute('disabled')).toBe(false);
		});

		it('/pricing은 열린다. 로그인 전에는 시작하기, 로그인 뒤에는 준비 중', () => {
			const { unmount } = renderApp('/pricing', only);
			expect(screen.getByRole('heading', { level: 1, name: '요금' })).toBeDefined();
			expect(screen.getAllByRole('link', { name: '시작하기' }).map((a) => a.getAttribute('href'))).toEqual(['/login', '/login', '/login']);
			unmount();

			setToken('jwt');
			renderApp('/pricing', only);
			expect(screen.getByRole('heading', { level: 1, name: '요금' })).toBeDefined();
			expect(screen.queryByRole('link', { name: '시작하기' })).toBeNull();
			expect(screen.getAllByText('준비 중').length).toBe(2);
			expect(screen.getByRole('button', { name: '내 계정' })).toBeDefined();
		});

		it('/login은 열린다. 이미 로그인돼 있으면 랜딩으로', () => {
			renderApp('/login', only);
			expect(screen.getByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();

			setToken('jwt');
			renderApp('/login', only);
			expect(screen.getByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
		});

		it('/docs는 열린다. /developers·/app·/invitations는 랜딩으로 보낸다', () => {
			const docs = renderApp('/docs', only);
			expect(screen.getByRole('heading', { level: 1, name: '시작하기' })).toBeDefined();
			docs.unmount();
			for (const path of ['/developers', '/app/events', '/invitations/abc']) {
				const { unmount } = renderApp(path, only);
				expect(screen.getByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
				unmount();
			}
		});

		it('로그인 상태의 랜딩: 상단에 프로필 메뉴만, 시작 자리는 준비 중. 메뉴에 이메일, 로그아웃하면 토큰을 지우고 /login으로', async () => {
			setToken('jwt');
			renderApp('/', only);
			expect(screen.getByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
			expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
			expect(screen.queryByRole('link', { name: '무료로 시작하기' })).toBeNull();
			expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull();
			expect(screen.getByText(/로그인되었습니다. 대시보드가 열리면/)).toBeDefined();
			expect(screen.getByRole('button', { name: '준비 중' }).hasAttribute('disabled')).toBe(true);

			// 시드 유저는 사진이 없어 이름 첫 글자
			const account = screen.getByRole('button', { name: '내 계정' });
			expect(await screen.findByText('시')).toBe(account);
			expect(account.querySelector('img')).toBeNull();

			await userEvent.setup().click(account);
			expect(await screen.findByText(ME.email)).toBeDefined();
			expect(screen.queryByText(ME.name)).toBeNull();
			// 대시보드는 열리기 전까지 비활성
			const items = screen.getAllByRole('menuitem');
			expect(items.map((m) => m.textContent)).toEqual(['대시보드', '로그아웃']);
			expect(items.map((m) => m.getAttribute('aria-disabled'))).toEqual(['true', null]);

			await userEvent.setup().click(screen.getByRole('menuitem', { name: '로그아웃' }));
			expect(await screen.findByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();
			expect(localStorage.getItem('munjigi.token')).toBeNull();
		});

		it('프로필 사진이 있으면 동그라미에 사진, 사진을 못 불러오면 이름 첫 글자', async () => {
			server.use(http.get('/api/users/me', () => HttpResponse.json({ ...ME, avatar_url: 'https://lh3.googleusercontent.com/a/photo' })));
			setToken('jwt');
			renderApp('/', only);
			const account = screen.getByRole('button', { name: '내 계정' });
			const img = await screen.findByRole('presentation');
			expect(img.getAttribute('src')).toBe('https://lh3.googleusercontent.com/a/photo');
			expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
			expect(account.textContent).toBe('');

			fireEvent.error(img);
			expect(await screen.findByText('시')).toBe(account);
			expect(account.querySelector('img')).toBeNull();
		});
	});
});
