import { Injectable } from '@nestjs/common';
import type { Plan } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { ProjectUsage, UsageRepository } from '../ports/usage.repository';

@Injectable()
export class PrismaUsageRepository implements UsageRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findPlan(userId: number): Promise<Plan | null> {
		const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
		return user?.plan ?? null;
	}

	// delivery에는 project_id가 없어 groupBy를 못 쓴다. project마다 한 번씩 센다
	async countDeliveriesByProject(userId: number, since: Date): Promise<ProjectUsage[]> {
		const projects = await this.prisma.project.findMany({ where: { user_id: userId }, select: { id: true, name: true }, orderBy: { id: 'asc' } });
		return Promise.all(
			projects.map(async (p) => ({
				project_id: p.id,
				name: p.name,
				delivery_count: await this.prisma.delivery.count({ where: { event: { project_id: p.id, received_at: { gte: since } } } }),
			})),
		);
	}
}
