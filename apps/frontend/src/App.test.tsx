import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from './App';
import { withQuery } from './test/render';

describe('App', () => {
	it('/ 는 랜딩이다', () => {
		localStorage.clear();
		render(withQuery(
			<MemoryRouter initialEntries={['/']}>
				<App scope="all" />
			</MemoryRouter>)
		);
		expect(screen.getByRole('heading', { level: 1, name: /웹훅을 안전하게 받아/ })).toBeDefined();
	});

	it('/login 은 로그인이다', () => {
		localStorage.clear();
		render(withQuery(
			<MemoryRouter initialEntries={['/login']}>
				<App scope="all" />
			</MemoryRouter>)
		);
		expect(screen.getByRole('button', { name: /Google 계정으로 로그인/ })).toBeDefined();
	});

	it('/developers 는 준비 중이다. 상단 메뉴에는 없다', () => {
		localStorage.clear();
		render(withQuery(
			<MemoryRouter initialEntries={['/developers']}>
				<App scope="all" />
			</MemoryRouter>)
		);
		expect(screen.getByText('준비 중입니다.')).toBeDefined();
		expect(screen.queryByRole('link', { name: '개발자' })).toBeNull();
		expect(screen.getByRole('link', { name: '문서' }).getAttribute('href')).toBe('/docs');
	});
});
