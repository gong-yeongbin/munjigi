import { randomUUID } from 'node:crypto';
import { Controller, Get, Module } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';
import type { ErrorBody } from '@/common/http/http-exception.filter';
import { Actor, Authenticated } from '@/common/auth/decorators';
import { configureApp } from '@/common/configure-app';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { GOOGLE_ID_TOKEN_VERIFIER, type GoogleIdTokenVerifier, type GoogleProfile } from '@/modules/auth/ports/google-id-token.verifier';

// 가드 동작만 보기 위한 테스트 전용 라우트. 전역 가드라 AppModule 밖의 컨트롤러에도 걸린다.
@Controller('e2e-probe')
class ProbeController {
	@Get('bare')
	bare() {
		return {};
	}

	@Authenticated()
	@Get('me')
	me(@Actor() actor: Actor) {
		return actor;
	}

	@Authenticated()
	@Get('projects/:projectId')
	project(@Actor() actor: Actor) {
		return actor;
	}
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

// 실제 구글 대신 'google:<key>' 토큰을 프로필로 바꿔 준다
const profiles = new Map<string, GoogleProfile>();
const fakeGoogle: GoogleIdTokenVerifier = { verify: (idToken) => Promise.resolve(profiles.get(idToken) ?? null) };

// supertest의 body는 any다. 응답 형식을 타입으로 못 박는다
const errorOf = (response: request.Response) => response.body as ErrorBody;

function newGoogleUser(): string {
	const key = randomUUID();
	profiles.set(`google:${key}`, { sub: `sub-${key}`, email: `${key}@test.munjigi.local`, email_verified: true, name: 'e2e', picture: null });
	return `google:${key}`;
}

describe('auth (e2e)', () => {
	let app: NestFastifyApplication;
	let prisma: PrismaService;
	const emails: string[] = [];

	async function login(idToken: string): Promise<string> {
		emails.push(profiles.get(idToken)!.email);
		const response = await request(app.getHttpServer()).post('/auth/google').send({ id_token: idToken }).expect(200);
		return (response.body as { access_token: string }).access_token;
	}

	async function userId(idToken: string): Promise<number> {
		return (await prisma.user.findUniqueOrThrow({ where: { email: profiles.get(idToken)!.email } })).id;
	}

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({ imports: [AppModule, ProbeModule] })
			.overrideProvider(GOOGLE_ID_TOKEN_VERIFIER)
			.useValue(fakeGoogle)
			.compile();

		app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
		configureApp(app);
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		// 127.0.0.1에 한 번 띄워 둔다. 안 띄우면 supertest가 요청마다 listen(0)으로 모든 주소(::)에 임시 포트를 잡고 127.0.0.1로 접속하는데,
		// 같은 포트를 127.0.0.1에만 잡아 둔 다른 프로그램(IDE 등)이 있으면 요청이 그쪽으로 가서 엉뚱한 401·404가 온다
		await app.listen(0, '127.0.0.1');
		prisma = app.get(PrismaService);
	});

	afterAll(async () => {
		const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
		const userIds = users.map((u) => u.id);
		await prisma.project.deleteMany({ where: { user_id: { in: userIds } } });
		await prisma.user_identity.deleteMany({ where: { user_id: { in: userIds } } });
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
		await app.close();
	});

	describe('POST /auth/google', () => {
		it('첫 로그인 시 user(free)·user_identity를 만들고, 두 번째는 다시 만들지 않는다', async () => {
			const idToken = newGoogleUser();
			const { sub, email } = profiles.get(idToken)!;

			await login(idToken);
			await login(idToken);

			const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { identities: true } });
			expect(user.plan).toBe('free');
			expect(user.identities).toMatchObject([{ provider: 'google', provider_user_id: sub }]);
			expect(await prisma.user.count({ where: { email } })).toBe(1);
		});

		it('구글 토큰이 유효하지 않으면 401 unauthenticated', async () => {
			const response = await request(app.getHttpServer()).post('/auth/google').send({ id_token: 'google:unknown' }).expect(401);
			expect(errorOf(response).code).toBe('unauthenticated');
		});

		it('id_token이 없으면 400 validation_failed와 필드별 details', async () => {
			const response = await request(app.getHttpServer()).post('/auth/google').send({}).expect(400);
			expect(errorOf(response).code).toBe('validation_failed');
			expect(errorOf(response).details?.map((d) => d.field)).toContain('id_token');
		});
	});

	describe('전역 가드', () => {
		it('@Public·@Authenticated가 없는 라우트는 로그인해도 403 (deny-by-default)', async () => {
			const token = await login(newGoogleUser());
			const response = await request(app.getHttpServer()).get('/e2e-probe/bare').set('Authorization', `Bearer ${token}`).expect(403);
			expect(errorOf(response).code).toBe('forbidden');
		});

		it('@Authenticated 라우트는 토큰이 없으면 401, 있으면 project 없는 주체', async () => {
			await request(app.getHttpServer()).get('/e2e-probe/me').expect(401);

			const idToken = newGoogleUser();
			const token = await login(idToken);
			const response = await request(app.getHttpServer()).get('/e2e-probe/me').set('Authorization', `Bearer ${token}`).expect(200);
			expect(response.body).toEqual({ kind: 'user', user_id: await userId(idToken), project_id: null });
		});

		it('내 project는 통과하고 project 주체를 붙인다. 남의 project는 404 project_not_found', async () => {
			const alice = newGoogleUser();
			const bob = newGoogleUser();
			const aliceToken = await login(alice);
			await login(bob);
			const mine = await prisma.project.create({ data: { user_id: await userId(alice), name: 'mine' } });
			const theirs = await prisma.project.create({ data: { user_id: await userId(bob), name: 'theirs' } });

			const own = await request(app.getHttpServer()).get(`/e2e-probe/projects/${mine.id}`).set('Authorization', `Bearer ${aliceToken}`).expect(200);
			expect(own.body).toEqual({ kind: 'user', user_id: await userId(alice), project_id: mine.id });

			const other = await request(app.getHttpServer()).get(`/e2e-probe/projects/${theirs.id}`).set('Authorization', `Bearer ${aliceToken}`).expect(404);
			expect(errorOf(other).code).toBe('project_not_found');
			await request(app.getHttpServer()).get('/e2e-probe/projects/abc').set('Authorization', `Bearer ${aliceToken}`).expect(404);
		});
	});
});
