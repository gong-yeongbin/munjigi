import { randomUUID } from 'node:crypto';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';
import type { ErrorBody } from '@/common/http/http-exception.filter';
import { configureApp } from '@/common/configure-app';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { GOOGLE_ID_TOKEN_VERIFIER, type GoogleIdTokenVerifier, type GoogleProfile } from '@/modules/auth/ports/google-id-token.verifier';

// e2e 공통. 실제 구글 대신 'google:<key>' 토큰을 프로필로 바꿔 주는 fake로 AppModule을 띄운다.
export type LoggedIn = { token: string; user_id: number; profile: GoogleProfile };

export type TestApp = {
	app: NestFastifyApplication;
	prisma: PrismaService;
	http: () => ReturnType<typeof request>;
	login: () => Promise<LoggedIn>;
	close: () => Promise<void>;
};

export async function createTestApp(): Promise<TestApp> {
	const profiles = new Map<string, GoogleProfile>();
	const fakeGoogle: GoogleIdTokenVerifier = { verify: (idToken) => Promise.resolve(profiles.get(idToken) ?? null) };
	const emails: string[] = [];

	const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(GOOGLE_ID_TOKEN_VERIFIER).useValue(fakeGoogle).compile();
	const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
	configureApp(app);
	await app.init();
	await app.getHttpAdapter().getInstance().ready();
	// 127.0.0.1에 한 번 띄워 둔다. 안 띄우면 supertest가 요청마다 listen(0)으로 모든 주소(::)에 임시 포트를 잡고 127.0.0.1로 접속하는데,
	// 같은 포트를 127.0.0.1에만 잡아 둔 다른 프로그램(IDE 등)이 있으면 요청이 그쪽으로 가서 엉뚱한 401·404가 온다
	await app.listen(0, '127.0.0.1');
	const prisma = app.get(PrismaService);

	// 새 구글 유저로 가입·로그인한다(plan free)
	async function login(): Promise<LoggedIn> {
		const key = randomUUID();
		const profile = { sub: `sub-${key}`, email: `${key}@test.munjigi.local`, email_verified: true, name: 'e2e', picture: 'https://example.com/a.png' };
		profiles.set(`google:${key}`, profile);
		emails.push(profile.email);
		const response = await request(app.getHttpServer()).post('/auth/google').send({ id_token: `google:${key}` }).expect(200);
		const user = await prisma.user.findUniqueOrThrow({ where: { email: profile.email }, select: { id: true } });
		return { token: (response.body as { access_token: string }).access_token, user_id: user.id, profile };
	}

	// login()으로 만든 유저와 그 유저의 project(아래 소스·목적지·이벤트는 FK cascade)를 지운다
	async function close(): Promise<void> {
		const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
		const userIds = users.map((u) => u.id);
		await prisma.project.deleteMany({ where: { user_id: { in: userIds } } });
		await prisma.user_identity.deleteMany({ where: { user_id: { in: userIds } } });
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
		await app.close();
	}

	return { app, prisma, http: () => request(app.getHttpServer()), login, close };
}

// supertest의 body는 any다. 응답 형식을 타입으로 못 박는다
export const errorOf = (response: request.Response) => response.body as ErrorBody;
