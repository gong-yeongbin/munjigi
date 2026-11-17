import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CipherService } from '@/infra/cipher/cipher.service';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { CreateCheck, ProjectRepository, ProjectView } from '../ports/project.repository';

// 이름 유니크는 식 인덱스 project_user_id_lower_name_key(마이그레이션 SQL)가 강제한다
const isNameConflict = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

const omit = { signing_secret_enc: true } as const;

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
	constructor(
		private readonly prisma: PrismaService,
		private readonly cipher: CipherService,
	) {}

	async create(userId: number, data: { name: string; signing_secret: string }, check: CreateCheck): Promise<ProjectView | 'name_conflict'> {
		try {
			return await this.prisma.$transaction(async (tx) => {
				// 같은 user의 생성을 줄 세운다. 개수를 센 뒤 만들기 전에 다른 요청이 끼어들지 못한다
				await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`;
				const [user, count] = await Promise.all([
					tx.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } }),
					tx.project.count({ where: { user_id: userId } }),
				]);
				check({ plan: user.plan, count });
				return tx.project.create({ data: { user_id: userId, name: data.name, signing_secret_enc: this.cipher.encrypt(data.signing_secret) }, omit });
			});
		} catch (e) {
			if (isNameConflict(e)) return 'name_conflict';
			throw e;
		}
	}

	list(userId: number, cursor: number | null, take: number): Promise<ProjectView[]> {
		return this.prisma.project.findMany({
			where: { user_id: userId, ...(cursor === null ? {} : { id: { lt: cursor } }) },
			orderBy: { id: 'desc' },
			take,
			omit,
		});
	}

	find(userId: number, id: number): Promise<ProjectView | null> {
		return this.prisma.project.findFirst({ where: { id, user_id: userId }, omit });
	}

	async update(userId: number, id: number, data: { name?: string }): Promise<ProjectView | null | 'name_conflict'> {
		try {
			const { count } = await this.prisma.project.updateMany({ where: { id, user_id: userId }, data });
			return count > 0 ? this.find(userId, id) : null;
		} catch (e) {
			if (isNameConflict(e)) return 'name_conflict';
			throw e;
		}
	}

	async remove(userId: number, id: number): Promise<boolean> {
		const { count } = await this.prisma.project.deleteMany({ where: { id, user_id: userId } });
		return count > 0;
	}

	async findSigningSecret(userId: number, id: number): Promise<string | null | undefined> {
		const row = await this.prisma.project.findFirst({ where: { id, user_id: userId }, select: { signing_secret_enc: true } });
		if (!row) return undefined;
		return row.signing_secret_enc === null ? null : this.cipher.decrypt(row.signing_secret_enc);
	}

	async setSigningSecret(userId: number, id: number, secret: string): Promise<boolean> {
		const { count } = await this.prisma.project.updateMany({ where: { id, user_id: userId }, data: { signing_secret_enc: this.cipher.encrypt(secret) } });
		return count > 0;
	}
}
