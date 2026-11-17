import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTHENTICATED, IS_PUBLIC, type RequestWithActor } from '@/common/auth/decorators';
import { PROJECT_ACCESS_REPOSITORY, type ProjectAccessRepository } from './ports/project-access.repository';
import { TOKEN_ISSUER, type TokenIssuer } from './ports/token.issuer';

type AuthRequest = RequestWithActor & { headers: { authorization?: string }; params: { projectId?: string } };

const PROJECT_NOT_FOUND = { code: 'project_not_found', message: '프로젝트가 없습니다.' };

const isId = (value: number) => Number.isSafeInteger(value) && value > 0;

// 전역 가드, deny-by-default. 모든 라우트는 @Public 또는 @Authenticated 중 하나가 있어야 한다.
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		@Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
		@Inject(PROJECT_ACCESS_REPOSITORY) private readonly projects: ProjectAccessRepository,
	) {}

	async canActivate(ctx: ExecutionContext): Promise<boolean> {
		const targets = [ctx.getHandler(), ctx.getClass()];
		if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
		if (!this.reflector.getAllAndOverride<boolean>(AUTHENTICATED, targets)) {
			throw new ForbiddenException({ code: 'forbidden', message: '접근 규칙이 지정되지 않은 라우트입니다.' });
		}

		const request = ctx.switchToHttp().getRequest<AuthRequest>();
		const token = /^Bearer (.+)$/.exec(request.headers.authorization ?? '')?.[1];
		const userId = token ? await this.tokens.verify(token) : null;
		if (userId === null) throw new UnauthorizedException({ code: 'unauthenticated', message: '인증이 필요합니다.' });

		if (request.params.projectId === undefined) {
			request.actor = { kind: 'user', user_id: userId, project_id: null };
			return true;
		}

		// 숫자가 아닌 :projectId, 남의 project, 없는 project 모두 404. 존재 여부를 노출하지 않는다
		const projectId = Number(request.params.projectId);
		if (!isId(projectId) || !(await this.projects.isOwner(projectId, userId))) throw new NotFoundException(PROJECT_NOT_FOUND);

		request.actor = { kind: 'user', user_id: userId, project_id: projectId };
		return true;
	}
}
