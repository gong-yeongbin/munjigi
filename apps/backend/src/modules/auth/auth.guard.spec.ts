import { type ExecutionContext, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Actor, Authenticated, Public } from '@/common/auth/decorators';
import { AuthGuard } from './auth.guard';
import type { ProjectAccessRepository } from './ports/project-access.repository';
import type { TokenIssuer } from './ports/token.issuer';

class Routes {
	@Public()
	open() {}
	bare() {}
	@Authenticated()
	loggedIn() {}
}

type Request = { headers: { authorization?: string }; params: { projectId?: string }; actor?: Actor };

function contextFor(handler: keyof Routes, request: Request): ExecutionContext {
	return {
		getHandler: () => Object.getOwnPropertyDescriptor(Routes.prototype, handler)!.value as () => void,
		getClass: () => Routes,
		switchToHttp: () => ({ getRequest: () => request }),
	} as unknown as ExecutionContext;
}

// 토큰 'valid-<userId>'만 유효하다. project 20은 user 10의 것
const tokens: TokenIssuer = {
	issue: (userId) => Promise.resolve(`valid-${userId}`),
	verify: (token) => Promise.resolve(token.startsWith('valid-') ? Number(token.slice(6)) : null),
};
const projects: ProjectAccessRepository = {
	isOwner: (projectId, userId) => Promise.resolve(projectId === 20 && userId === 10),
};

const guard = new AuthGuard(new Reflector(), tokens, projects);

function request(token: string | null, projectId?: string): Request {
	return { headers: token ? { authorization: `Bearer ${token}` } : {}, params: { projectId } };
}

describe('AuthGuard', () => {
	it('@Public은 토큰 없이 통과한다', async () => {
		expect(await guard.canActivate(contextFor('open', request(null)))).toBe(true);
	});

	it('@Public·@Authenticated가 모두 없으면 403 (deny-by-default)', async () => {
		await expect(guard.canActivate(contextFor('bare', request('valid-10')))).rejects.toThrow(ForbiddenException);
	});

	it('토큰이 없거나 형식이 틀리거나 유효하지 않으면 401', async () => {
		await expect(guard.canActivate(contextFor('loggedIn', request(null)))).rejects.toThrow(UnauthorizedException);
		await expect(guard.canActivate(contextFor('loggedIn', request('invalid')))).rejects.toThrow(UnauthorizedException);
		const basic = { headers: { authorization: 'Basic abc' }, params: {} };
		await expect(guard.canActivate(contextFor('loggedIn', basic))).rejects.toThrow(UnauthorizedException);
	});

	it(':projectId가 없으면 로그인만 보고 project 없는 주체를 붙인다', async () => {
		const req = request('valid-10');
		expect(await guard.canActivate(contextFor('loggedIn', req))).toBe(true);
		expect(req.actor).toEqual({ kind: 'user', user_id: 10, project_id: null });
	});

	it('내 project면 통과하고 project 주체를 붙인다', async () => {
		const req = request('valid-10', '20');
		expect(await guard.canActivate(contextFor('loggedIn', req))).toBe(true);
		expect(req.actor).toEqual({ kind: 'user', user_id: 10, project_id: 20 });
	});

	it('남의 project, 없는 project, 숫자가 아닌 projectId는 404 project_not_found', async () => {
		for (const [token, projectId] of [
			['valid-11', '20'],
			['valid-10', '21'],
			['valid-10', 'abc'],
		] as const) {
			const error = await guard.canActivate(contextFor('loggedIn', request(token, projectId))).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(NotFoundException);
			expect((error as NotFoundException).getResponse()).toMatchObject({ code: 'project_not_found' });
		}
	});
});
