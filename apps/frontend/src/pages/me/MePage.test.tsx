import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { server } from '@/test/msw';
import { renderApp } from '@/test/render';

describe('MePage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('내 이름·이메일·플랜·가입일을 보여주고 로그아웃한다', async () => {
		renderApp('/app/me');
		expect(await screen.findByText('seed@munjigi.local')).toBeDefined();
		expect(screen.getByText('시드')).toBeDefined();
		expect(screen.getByText('Team')).toBeDefined();
		await userEvent.setup().click(screen.getByRole('button', { name: '로그아웃' }));
		expect(await screen.findByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();
	});

	it('조회가 실패하면 오류를 보여준다', async () => {
		server.use(http.get('/api/users/me', () => HttpResponse.json({ code: 'user_not_found', message: '유저가 없습니다.' }, { status: 404 })));
		renderApp('/app/me');
		expect(await screen.findByText('유저가 없습니다.')).toBeDefined();
	});
});
