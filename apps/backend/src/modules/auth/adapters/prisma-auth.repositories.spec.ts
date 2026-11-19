import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { CipherService } from '@/infra/cipher/cipher.service';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PrismaAccountRepository } from './prisma-account.repository';
import { PrismaProjectAccessRepository } from './prisma-project-access.repository';

// adapter는 docker compose의 postgres 위에서 통합으로 본다(`pnpm docker:up && pnpm db:deploy` 선행).
describe('Prisma auth 저장소 (통합)', () => {
	const config = new ConfigService({ DATABASE_URL: process.env.DATABASE_URL, ENCRYPTION_KEY: process.env.ENCRYPTION_KEY });
	const prisma = new PrismaService(config);
	const cipher = new CipherService(config);
	const accounts = new PrismaAccountRepository(prisma, cipher);
	const FIRST = { name: 'default', signing_secret: 'rdsec_test' };
	const access = new PrismaProjectAccessRepository(prisma);
	const createdUserIds: number[] = [];

	function profile() {
		const key = randomUUID();
		return { sub: `sub-${key}`, email: `${key}@test.munjigi.local`, email_verified: true, name: '테스트', picture: null };
	}

	afterAll(async () => {
		await prisma.project.deleteMany({ where: { user_id: { in: createdUserIds } } });
		await prisma.user_identity.deleteMany({ where: { user_id: { in: createdUserIds } } });
		await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
		await prisma.$disconnect();
	});

	it('가입하면 user(free)·google identity·첫 project(서명 키 암호화)가 생기고, 내 project만 isOwner가 true다', async () => {
		const p = profile();
		const userId = await accounts.signUpWithGoogle(p, FIRST);
		createdUserIds.push(userId);

		expect(await accounts.findUserIdByGoogleSub(p.sub)).toBe(userId);
		expect(await accounts.findUserIdByEmail(p.email)).toBe(userId);
		expect(await prisma.user.findUniqueOrThrow({ where: { id: userId } })).toMatchObject({ plan: 'free', name: '테스트' });

		const [project, ...rest] = await prisma.project.findMany({ where: { user_id: userId } });
		expect(rest).toEqual([]);
		expect(project).toMatchObject({ name: 'default', suspended_at: null });
		expect(cipher.decrypt(project!.signing_secret_enc!)).toBe('rdsec_test');
		expect(await access.isOwner(project!.id, userId)).toBe(true);
		expect(await access.isOwner(project!.id, userId + 1)).toBe(false);
	});

	it('없는 sub·이메일·project는 null/false', async () => {
		expect(await accounts.findUserIdByGoogleSub('sub-none')).toBeNull();
		expect(await accounts.findUserIdByEmail('none@test.munjigi.local')).toBeNull();
		expect(await access.isOwner(2147483647, 2147483647)).toBe(false);
	});

	it('기존 유저에 구글 identity를 연결한다', async () => {
		const userId = await accounts.signUpWithGoogle(profile(), FIRST);
		createdUserIds.push(userId);

		await accounts.linkGoogleIdentity(userId, 'sub-linked-' + userId);

		expect(await accounts.findUserIdByGoogleSub('sub-linked-' + userId)).toBe(userId);
	});
});
