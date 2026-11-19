import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setToken } from '@/auth/token';
import { withQuery } from '@/test/render';
import { LandingPage } from './LandingPage';

const renderLanding = () =>
	render(withQuery(
		<MemoryRouter initialEntries={['/']}>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/app" element={<p>대시보드</p>} />
				<Route path="/login" element={<p>로그인 화면</p>} />
			</Routes>
		</MemoryRouter>
	));

describe('LandingPage', () => {
	beforeEach(() => localStorage.clear());

	it('제목, 실제 이벤트 화면 조각, 기능 6개, 0원 요금, GitHub 링크를 보여준다', () => {
		renderLanding();
		expect(screen.getByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
		expect(screen.getAllByRole('group', { name: '이벤트 화면 예시' }).length).toBeGreaterThan(0);
		expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
			'받는 즉시 저장하고 중복은 걸러냅니다',
			'재시도 방식은 연결마다 설정합니다',
			'들어오는 서명은 검증하고, 나가는 요청에는 서명을 붙입니다',
			'목적지가 불안정하면 잠시 멈춥니다',
			'실패한 전달은 다시 보낼 수 있습니다',
			'거부된 요청도 기록합니다',
		]);
		expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toContain('github.com');
	});

	it('로그인·시작하기·무료로 시작하기는 /login, 요금은 /pricing으로 간다', () => {
		renderLanding();
		expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
		expect(screen.getByRole('link', { name: '시작하기' }).getAttribute('href')).toBe('/login');
		expect(screen.getByRole('link', { name: '무료로 시작하기' }).getAttribute('href')).toBe('/login');
		expect(screen.getByRole('link', { name: '요금' }).getAttribute('href')).toBe('/pricing');
	});

	it('끝의 새 프로젝트 폼은 이름을 /login으로 넘긴다. 이름이 비면 못 보낸다', () => {
		renderLanding();
		const input = screen.getByLabelText('이름');
		const submit = screen.getByRole('button', { name: '만들고 시작하기' });
		fireEvent.change(input, { target: { value: '  ' } });
		expect(submit.hasAttribute('disabled')).toBe(true);
		fireEvent.change(input, { target: { value: 'blog' } });
		fireEvent.click(submit);
		expect(screen.getByText('로그인 화면')).toBeDefined();
	});

	it('로그인돼 있어도 랜딩을 보여준다. 대시보드로 보내지 않는다', () => {
		setToken('jwt');
		renderLanding();
		expect(screen.getByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
		expect(screen.queryByText('대시보드')).toBeNull();
	});
});
