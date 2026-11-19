import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { server, USAGE } from '@/test/msw';
import { renderApp } from '@/test/render';

describe('UsagePage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('이번 달 사용량·포함량·남은 수와 프로젝트별 전달 수를 보여준다', async () => {
		renderApp('/app/usage');
		expect(await screen.findByText('1,284')).toBeDefined();
		expect(screen.getByText('/ 10,000 전달')).toBeDefined();
		expect(screen.getByText(/2026년 10월/)).toBeDefined();
		expect(screen.getByText(/8,716건 남았습니다. 넘으면 넘은 만큼만 종량/)).toBeDefined();
		expect(screen.getByRole('progressbar', { name: '포함량 대비 사용량' }).getAttribute('aria-valuenow')).toBe('1284');
		expect(screen.getByRole('cell', { name: 'shop' })).toBeDefined();
		expect(screen.getByRole('cell', { name: '812' })).toBeDefined();
		expect(screen.getByRole('cell', { name: '0' })).toBeDefined();
	});

	it('Starter가 포함량을 다 쓰면 보류 안내, 유료가 넘으면 종량 안내', async () => {
		server.use(http.get('/api/users/me/usage', () => HttpResponse.json({ ...USAGE, plan: 'free', included: 1000, used: 1000 })));
		renderApp('/app/usage');
		expect(await screen.findByText(/이번 달 포함량을 다 썼습니다. 들어오는 웹훅은 받아 두고 전달은 보류합니다/)).toBeDefined();
		expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1000');

		server.use(http.get('/api/users/me/usage', () => HttpResponse.json({ ...USAGE, used: 12000, projects: [] })));
		renderApp('/app/usage');
		expect(await screen.findByText(/포함량을 2,000건 넘었습니다. 넘은 만큼 10만 건당/)).toBeDefined();
		expect(screen.getByText('프로젝트가 없습니다')).toBeDefined();
	});

	it('Starter에서 남았을 때는 보류 안내. 조회가 실패하면 오류', async () => {
		server.use(http.get('/api/users/me/usage', () => HttpResponse.json({ ...USAGE, plan: 'free', included: 1000, used: 10 })));
		renderApp('/app/usage');
		expect(await screen.findByText(/990건 남았습니다. 다 쓰면 웹훅은 계속 받아 두고 전달만 보류합니다/)).toBeDefined();

		server.use(http.get('/api/users/me/usage', () => HttpResponse.json({ code: 'user_not_found', message: '유저가 없습니다.' }, { status: 404 })));
		renderApp('/app/usage');
		expect(await screen.findByText('유저가 없습니다.')).toBeDefined();
	});
});
