import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'auth:public';
export const AUTHENTICATED = 'auth:authenticated';

// 가드가 인증을 끝내고 요청에 붙이는 주체. :projectId가 없는 라우트(/users/me 등)면 project_id가 null이다.
// api_key 주체는 5. api_key 모듈에서 추가한다.
export type Actor = { kind: 'user'; user_id: number; project_id: number | null };

export type RequestWithActor = { actor?: Actor };

// 인증 없이 호출할 수 있는 라우트
export const Public = () => SetMetadata(IS_PUBLIC, true);

// 로그인이 필요한 라우트. :projectId가 있으면 그 project가 로그인한 user의 것이어야 한다(아니면 404).
export const Authenticated = () => SetMetadata(AUTHENTICATED, true);

export function actorFromContext(ctx: ExecutionContext): Actor {
	const actor = ctx.switchToHttp().getRequest<RequestWithActor>().actor;
	// @Public 라우트에서 @Actor()를 쓰면 여기 온다. 런타임 데이터가 아니라 코드 실수다.
	if (!actor) throw new Error('@Actor()는 @Authenticated 라우트에서만 쓸 수 있다');
	return actor;
}

// 타입 Actor와 같은 이름이다. 핸들러에서 `@Actor() actor: Actor`로 쓴다.
export const Actor = createParamDecorator((_: unknown, ctx: ExecutionContext) => actorFromContext(ctx));
