import { ConfigService } from '@nestjs/config';
import { CipherService } from '@/infra/cipher/cipher.service';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { CreateCheck } from '../ports/project.repository';
import { PrismaProjectRepository } from './prisma-project.repository';

// adapter는 docker compose의 postgres 위에서 통합으로 본다(`pnpm docker:up && pnpm db:deploy` 선행).
describe('PrismaProjectRepository (통합)', () => {
	const config = new ConfigService({ DATABASE_URL: process.env.DATABASE_URL, ENCRYPTION_KEY: process.env.ENCRYPTION_KEY });
	const prisma = new PrismaService(config);
	const cipher = new CipherService(config);
	const projects = new PrismaProjectRepository(prisma, cipher);
	// 이름만 넘기던 호출을 그대로 쓰려고 감싼다
	const create = (user: number, name: string, check: CreateCheck) => projects.create(user, { name, signing_secret: `rdsec_${name}` }, check);
	const allow: CreateCheck = () => undefined;
	let userId: number;
	let otherUserId: number;

	beforeAll(async () => {
		userId = (await prisma.user.create({ data: { email: `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}@test.munjigi.local`, name: 'project 테스트', plan: 'team' } })).id;
		otherUserId = (await prisma.user.create({ data: { email: `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}@test.munjigi.local`, name: '남의 계정' } })).id;
	});

	afterAll(async () => {
		await prisma.project.deleteMany({ where: { user_id: { in: [userId, otherUserId] } } });
		await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
		await prisma.$disconnect();
	});

	it('create — 잠근 상태의 plan·개수를 check에 넘기고, check가 던지면 만들지 않는다', async () => {
		const seen: unknown[] = [];
		const a = await create(userId, 'a', (state) => void seen.push(state));
		expect(a).toMatchObject({ user_id: userId, name: 'a', suspended_at: null });
		expect(seen).toEqual([{ plan: 'team', count: 0 }]);

		await expect(
			create(userId, 'rejected', () => {
				throw new Error('limit');
			}),
		).rejects.toThrow('limit');
		expect(await prisma.project.count({ where: { user_id: userId, name: 'rejected' } })).toBe(0);
	});

	it('create — 동시에 들어와도 잠금으로 줄 서서 상한(1)을 넘지 않는다', async () => {
		// 커넥션을 미리 열어 둔다. 안 그러면 첫 요청이 끝날 때까지 나머지가 접속 중이라 경합이 생기지 않아
		// 잠금이 없어도 통과한다(잠금을 빼고 실패하는 것을 확인했다)
		await Promise.all(Array.from({ length: 10 }, () => prisma.$queryRaw`SELECT pg_sleep(0.05)::text`));
		const limitOne: CreateCheck = ({ count }) => {
			if (count >= 1) throw new Error('limit');
		};
		const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => create(otherUserId, `r${i}`, limitOne)));

		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(await prisma.project.count({ where: { user_id: otherUserId } })).toBe(1);
	});

	it('create·update — 같은 user에 같은 이름(대소문자 무시)이면 name_conflict, 다른 user는 괜찮다', async () => {
		await create(userId, 'Shop', allow);
		const blog = await create(userId, 'blog', allow);

		expect(await create(userId, 'shop', allow)).toBe('name_conflict');
		expect(await create(otherUserId, 'shop', allow)).toMatchObject({ name: 'shop' });
		expect(await projects.update(userId, (blog as { id: number }).id, { name: 'SHOP' })).toBe('name_conflict');
	});

	it('서명 키는 암호화해 저장하고 조회·목록 응답에 내주지 않는다. 교체가 된다', async () => {
		const p = (await create(userId, 'signed', allow)) as { id: number };
		expect(p).not.toHaveProperty('signing_secret_enc');
		expect(await projects.find(userId, p.id)).not.toHaveProperty('signing_secret_enc');
		expect((await projects.list(userId, null, 100)).every((row) => !('signing_secret_enc' in row))).toBe(true);

		const stored = async () => (await prisma.project.findUniqueOrThrow({ where: { id: p.id } })).signing_secret_enc;
		expect(await stored()).not.toContain('rdsec_signed');
		expect(await projects.findSigningSecret(userId, p.id)).toBe('rdsec_signed');

		expect(await projects.setSigningSecret(userId, p.id, 'rdsec_rotated')).toBe(true);
		expect(await projects.findSigningSecret(userId, p.id)).toBe('rdsec_rotated');

		// 다른 user에게는 보이지도 바뀌지도 않는다
		expect(await projects.findSigningSecret(otherUserId, p.id)).toBeUndefined();
		expect(await projects.setSigningSecret(otherUserId, p.id, 'rdsec_hacked')).toBe(false);
		expect(await projects.findSigningSecret(userId, p.id)).toBe('rdsec_rotated');
	});

	it('키가 없는 예전 project는 findSigningSecret이 null이다', async () => {
		const legacy = await prisma.project.create({ data: { user_id: userId, name: 'legacy' } });
		expect(await projects.findSigningSecret(userId, legacy.id)).toBeNull();
	});

	it('list — id 내림차순, cursor보다 작은 것부터', async () => {
		const all = await projects.list(userId, null, 100);
		expect(all.map((p) => p.id)).toEqual([...all.map((p) => p.id)].sort((x, y) => y - x));
		expect((await projects.list(userId, all[0]!.id, 100)).map((p) => p.id)).toEqual(all.slice(1).map((p) => p.id));
	});

	it('find·update·remove — 타 user id는 null/false', async () => {
		const p = (await create(userId, 'before', allow)) as { id: number };

		expect(await projects.find(otherUserId, p.id)).toBeNull();
		expect(await projects.update(otherUserId, p.id, { name: 'hacked' })).toBeNull();
		expect(await projects.remove(otherUserId, p.id)).toBe(false);

		expect(await projects.update(userId, p.id, { name: 'after' })).toMatchObject({ id: p.id, name: 'after' });
		expect(await projects.remove(userId, p.id)).toBe(true);
		expect(await projects.find(userId, p.id)).toBeNull();
	});
});
