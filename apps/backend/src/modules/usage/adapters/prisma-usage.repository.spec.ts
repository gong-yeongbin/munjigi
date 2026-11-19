import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PrismaUsageRepository } from './prisma-usage.repository';

// adapter는 docker compose의 postgres 위에서 통합으로 본다(`pnpm docker:up && pnpm db:deploy` 선행)
describe('PrismaUsageRepository (통합)', () => {
	const prisma = new PrismaService(new ConfigService({ DATABASE_URL: process.env.DATABASE_URL }));
	const repo = new PrismaUsageRepository(prisma);
	let userId: number;
	let other: number;
	let shop: number;
	let blog: number;

	beforeAll(async () => {
		await prisma.onModuleInit();
		userId = (await prisma.user.create({ data: { email: `usage-${randomUUID()}@test.munjigi.local`, name: 'usage', plan: 'pro' } })).id;
		other = (await prisma.user.create({ data: { email: `usage-other-${randomUUID()}@test.munjigi.local`, name: 'other', plan: 'free' } })).id;
		shop = (await prisma.project.create({ data: { user_id: userId, name: 'shop' } })).id;
		blog = (await prisma.project.create({ data: { user_id: userId, name: 'blog' } })).id;
		const otherProject = (await prisma.project.create({ data: { user_id: other, name: 'x' } })).id;
		const event = (project_id: number, received_at: string, key: string) => ({ project_id, idempotency_key: key, headers: {}, body: new Uint8Array(0), size: 0, received_at: new Date(received_at) });
		await prisma.event.createMany({
			data: [
				event(shop, '2026-10-05T00:00:00Z', 'a'),
				event(shop, '2026-10-20T00:00:00Z', 'b'),
				// 월초 전 것은 빠진다
				event(shop, '2026-09-30T14:59:59Z', 'c'),
				event(otherProject, '2026-10-05T00:00:00Z', 'd'),
			],
		});
		// a는 목적지 두 곳, 나머지는 한 곳으로 간다
		const ids = new Map((await prisma.event.findMany({ where: { project_id: { in: [shop, otherProject] } }, select: { id: true, idempotency_key: true } })).map((e) => [e.idempotency_key, e.id]));
		await prisma.delivery.createMany({ data: ['a', 'a', 'b', 'c', 'd'].map((key) => ({ event_id: ids.get(key)! })) });
	});

	afterAll(async () => {
		await prisma.project.deleteMany({ where: { user_id: { in: [userId, other] } } });
		await prisma.user.deleteMany({ where: { id: { in: [userId, other] } } });
		await prisma.onModuleDestroy();
	});

	it('findPlan — user의 플랜. 없으면 null', async () => {
		expect(await repo.findPlan(userId)).toBe('pro');
		expect(await repo.findPlan(0)).toBeNull();
	});

	it('countDeliveriesByProject — 그 user의 프로젝트만, since 이후 이벤트의 delivery만, 없는 프로젝트는 0', async () => {
		expect(await repo.countDeliveriesByProject(userId, new Date('2026-09-30T15:00:00Z'))).toEqual([
			{ project_id: shop, name: 'shop', delivery_count: 3 },
			{ project_id: blog, name: 'blog', delivery_count: 0 },
		]);
	});
});
