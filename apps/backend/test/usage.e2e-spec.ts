import { randomUUID } from 'node:crypto';
import { INCLUDED_EVENTS } from '@/common/plan-limits';
import { usagePeriod } from '@/modules/ingress/domain/usage-period';
import { newSlug } from '@/modules/sources/domain/slug';
import type { UsageDto } from '@/modules/usage/dto/usage.dto';
import { createTestApp, errorOf, type LoggedIn, type TestApp } from './support';

describe('usage (e2e)', () => {
	let t: TestApp;
	let owner: LoggedIn;
	let stranger: LoggedIn;
	let projectId: number;
	let slug: string;

	const auth = (who: LoggedIn) => ({ Authorization: `Bearer ${who.token}` });
	const PATH = '/users/me/usage';

	beforeAll(async () => {
		t = await createTestApp();
		[owner, stranger] = [await t.login(), await t.login()];
		await t.prisma.user.update({ where: { id: owner.user_id }, data: { plan: 'pro' } });
		projectId = (await t.prisma.project.create({ data: { user_id: owner.user_id, name: 'shop' } })).id;
		await t.prisma.project.create({ data: { user_id: owner.user_id, name: 'blog' } });
		const source = await t.prisma.source.create({ data: { project_id: projectId, slug: newSlug(), name: 's' } });
		const destination = await t.prisma.destination.create({ data: { project_id: projectId, name: 'd', url: 'https://example.com/hook' } });
		await t.prisma.connection.create({ data: { source_id: source.id, destination_id: destination.id } });
		slug = source.slug;
	});

	afterAll(() => t.close());

	it('GET /users/me/usage — 보낼 전달 수만큼 used가 오르고 프로젝트별로 센다. 거부된 요청은 안 센다', async () => {
		const before = (await t.http().get(PATH).set(auth(owner)).expect(200)).body as UsageDto;
		expect(before).toMatchObject({ period: usagePeriod(new Date()), plan: 'pro', included: INCLUDED_EVENTS.pro, used: 0 });
		expect(before.projects.map((p) => [p.name, p.delivery_count])).toEqual([
			['shop', 0],
			['blog', 0],
		]);
		expect(before.projects[0]?.project_id).toBe(projectId);

		for (let i = 0; i < 2; i++) await t.http().post(`/in/${slug}`).set('Content-Type', 'application/json').send(JSON.stringify({ order: randomUUID() })).expect(200);
		// 없는 소스로 보낸 것은 거부라 안 센다
		await t.http().post(`/in/${newSlug()}`).send('{}').expect(404);

		const after = (await t.http().get(PATH).set(auth(owner)).expect(200)).body as UsageDto;
		expect(after.used).toBe(2);
		expect(after.projects.find((p) => p.project_id === projectId)?.delivery_count).toBe(2);
		expect(new Date(after.period_start).getTime()).toBeLessThanOrEqual(Date.now());
	});

	it('다른 user의 사용량은 섞이지 않는다. free는 포함량 10,000', async () => {
		const mine = (await t.http().get(PATH).set(auth(stranger)).expect(200)).body as UsageDto;
		expect(mine).toMatchObject({ plan: 'free', included: INCLUDED_EVENTS.free, used: 0, projects: [] });
	});

	it('행이 지워진 user의 토큰은 404 user_not_found', async () => {
		const gone = await t.login();
		await t.prisma.user_identity.deleteMany({ where: { user_id: gone.user_id } });
		await t.prisma.user.delete({ where: { id: gone.user_id } });
		const response = await t.http().get(PATH).set(auth(gone)).expect(404);
		expect(errorOf(response).code).toBe('user_not_found');
	});

	it('토큰이 없으면 401', async () => {
		await t.http().get(PATH).expect(401);
	});
});
