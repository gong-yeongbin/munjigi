import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';

describe('GET /health', () => {
	let app: NestFastifyApplication;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

		app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
		await app.init();
		// Fastify는 라우트 등록이 비동기라 ready()를 기다리지 않으면 404가 난다.
		await app.getHttpAdapter().getInstance().ready();
		// 127.0.0.1에 한 번 띄워 둔다. 안 띄우면 supertest가 요청마다 listen(0)으로 모든 주소(::)에 임시 포트를 잡고 127.0.0.1로 접속하는데,
		// 같은 포트를 127.0.0.1에만 잡아 둔 다른 프로그램(IDE 등)이 있으면 요청이 그쪽으로 가서 엉뚱한 401·404가 온다
		await app.listen(0, '127.0.0.1');
	});

	afterAll(async () => {
		await app.close();
	});

	it('200과 status: ok를 응답한다', async () => {
		const response = await request(app.getHttpServer()).get('/health');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});
});
