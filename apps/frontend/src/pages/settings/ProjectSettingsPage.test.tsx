import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setToken } from '@/auth/token';
import { PROJECT, server } from '@/test/msw';
import { renderApp } from '@/test/render';

const user = () => userEvent.setup();

describe('ProjectSettingsPage', () => {
	beforeEach(() => {
		localStorage.clear();
		setToken('jwt');
	});

	it('이름을 바꾸고, 서명 키를 보고 복사하고, 교체는 확인 뒤', async () => {
		const patched: unknown[] = [];
		server.use(
			http.patch('/api/projects/10', async ({ request }) => {
				patched.push(await request.json());
				return HttpResponse.json({ ...PROJECT, name: 'store' });
			})
		);
		renderApp('/app/settings');
		const u = user();
		const nameInput = await screen.findByLabelText('프로젝트 이름');
		await waitFor(() => expect(nameInput.getAttribute('value')).toBe('shop'));
		expect(screen.getByRole('button', { name: '저장' }).hasAttribute('disabled')).toBe(true);
		await u.clear(nameInput);
		await u.type(nameInput, 'store');
		await u.click(screen.getByRole('button', { name: '저장' }));
		expect(await screen.findByText('이름을 바꿨습니다.')).toBeDefined();
		expect(patched[0]).toEqual({ name: 'store' });

		await u.click(screen.getByRole('button', { name: '키 보기' }));
		expect((await screen.findByLabelText('서명 키')).getAttribute('value')).toBe('whsec_seed_secret');
		await u.click(screen.getByRole('button', { name: '서명 키 복사' }));
		expect(await navigator.clipboard.readText()).toBe('whsec_seed_secret');
		await u.click(screen.getByRole('button', { name: '키 교체' }));
		await u.click(await screen.findByRole('button', { name: '교체' }));
		expect(await screen.findByText(/새 키를 만들었습니다/)).toBeDefined();
		expect(screen.getByLabelText('서명 키').getAttribute('value')).toBe('whsec_rotated');
	});

	it('프로젝트 삭제는 확인 뒤 지우고 이벤트 화면으로 간다', async () => {
		renderApp('/app/settings');
		const u = user();
		await screen.findByLabelText('프로젝트 이름');
		await u.click(screen.getByRole('button', { name: '이 프로젝트 삭제' }));
		expect(await screen.findByText('"shop" 프로젝트를 지울까요?')).toBeDefined();
		await u.click(screen.getByRole('button', { name: '지우기' }));
		expect(await screen.findByText('프로젝트를 지웠습니다.')).toBeDefined();
		expect(await screen.findByRole('heading', { name: '이벤트' })).toBeDefined();
	});


	it('서명 키 조회·교체·삭제가 실패하면 백엔드 메시지를 보여준다', async () => {
		server.use(
			http.get('/api/projects/10/signing-secret', () => HttpResponse.json({ code: 'forbidden', message: '키를 볼 수 없습니다.' }, { status: 403 })),
			http.post('/api/projects/10/signing-secret/rotate', () => HttpResponse.json({ code: 'forbidden', message: '키를 바꿀 수 없습니다.' }, { status: 403 })),
			http.delete('/api/projects/10', () => HttpResponse.json({ code: 'forbidden', message: '지울 수 없습니다.' }, { status: 403 })),
			http.patch('/api/projects/10', () => HttpResponse.json({ code: 'validation_failed', message: '이름이 너무 깁니다.' }, { status: 400 }))
		);
		renderApp('/app/settings');
		const u = user();
		await screen.findByLabelText('프로젝트 이름');
		await u.click(screen.getByRole('button', { name: '키 보기' }));
		expect(await screen.findByText('키를 볼 수 없습니다.')).toBeDefined();
		await u.click(screen.getByRole('button', { name: '키 교체' }));
		await u.click(await screen.findByRole('button', { name: '교체' }));
		expect(await screen.findByText('키를 바꿀 수 없습니다.')).toBeDefined();
		await u.type(screen.getByLabelText('프로젝트 이름'), 'x');
		await u.click(screen.getByRole('button', { name: '저장' }));
		expect(await screen.findByText('이름이 너무 깁니다.')).toBeDefined();
		await u.click(screen.getByRole('button', { name: '이 프로젝트 삭제' }));
		await u.click(await screen.findByRole('button', { name: '지우기' }));
		expect(await screen.findByText('지울 수 없습니다.')).toBeDefined();
	});

	it('프로젝트가 없으면 안내만 보여준다', async () => {
		server.use(http.get('/api/projects', () => HttpResponse.json({ data: [], next_cursor: null })));
		renderApp('/app/settings');
		expect(await screen.findByText('프로젝트를 먼저 만드세요.')).toBeDefined();
	});
});
