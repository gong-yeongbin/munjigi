import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PricingPage } from './PricingPage';

describe('PricingPage', () => {
	it('플랜 2개(Starter·Pro)의 이름·가격·보존일·초과 단가를 보여준다', () => {
		render(
			<MemoryRouter>
				<PricingPage />
			</MemoryRouter>
		);
		expect(screen.getByRole('heading', { level: 1, name: '요금' })).toBeDefined();
		for (const [name, price, retention] of [
			['Starter', '0원', '보존 3일'],
			['Pro', '49,900원', '보존 7일'],
		]) {
			expect(screen.getByText(name!)).toBeDefined();
			expect(screen.getByText(price!)).toBeDefined();
			expect(screen.getByText(retention!)).toBeDefined();
		}
		// 상단 바 1개 + 카드 2개
		expect(screen.getAllByRole('link', { name: '시작하기' }).map((a) => a.getAttribute('href'))).toEqual(['/login', '/login', '/login']);
		expect(screen.getByText('초과분 10만 건당 5,000원부터')).toBeDefined();
		expect(screen.queryByText('Business')).toBeNull();
		expect(screen.getByText('초과하면 전달 보류')).toBeDefined();
		expect(screen.getAllByText('목적지당 초당 5건 전달')).toHaveLength(2);
	});

	it('모든 플랜 공통 항목과 자주 묻는 질문 5개를 보여준다', () => {
		render(
			<MemoryRouter>
				<PricingPage />
			</MemoryRouter>
		);
		expect(screen.getByText('자동 재시도')).toBeDefined();
		expect(screen.getByText('내부망 주소 차단')).toBeDefined();
		expect(screen.getByText('포함된 건수를 넘으면 어떻게 되나요?')).toBeDefined();
		expect(screen.getByText('무엇을 한 건으로 세나요?')).toBeDefined();
		expect(screen.getByText('웹훅이 한꺼번에 많이 들어오면 어떻게 되나요?')).toBeDefined();
		expect(screen.getByText('받지 않는 웹훅도 있나요?')).toBeDefined();
		// 첫 질문은 열려 있어 구간 단가와 계산 단위가 보인다
		expect(screen.getByText(/1만 건 단위로 나눠 계산합니다.*500만 건을 넘는 부분은 2,500원.*1,000만 건을 넘는 부분은 1,500원.*2,000만 건을 넘는 부분은 1,000원/)).toBeDefined();
	});

	it('자주 묻는 질문은 첫 질문이 열려 있고, 누른 질문만 펼쳐지며, 다시 누르면 닫힌다', () => {
		render(
			<MemoryRouter>
				<PricingPage />
			</MemoryRouter>
		);
		expect(screen.getByText(/Starter 플랜은 웹훅을 계속 받아 저장하되/)).toBeDefined();
		fireEvent.click(screen.getByRole('button', { name: '무엇을 한 건으로 세나요?' }));
		expect(screen.getByText(/웹훅을 목적지 한 곳으로 보내는 전달 한 건을 셉니다/)).toBeDefined();
		expect(screen.queryByText(/Starter 플랜은 웹훅을 계속 받아 저장하되/)).toBeNull();
		expect(screen.getByRole('button', { name: '무엇을 한 건으로 세나요?' }).getAttribute('aria-expanded')).toBe('true');
		fireEvent.click(screen.getByRole('button', { name: '무엇을 한 건으로 세나요?' }));
		expect(screen.queryByText(/웹훅을 목적지 한 곳으로 보내는 전달 한 건을 셉니다/)).toBeNull();
	});
});
