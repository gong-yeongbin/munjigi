import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { ProjectAccessRepository } from '../ports/project-access.repository';

@Injectable()
export class PrismaProjectAccessRepository implements ProjectAccessRepository {
	constructor(private readonly prisma: PrismaService) {}

	async isOwner(projectId: number, userId: number): Promise<boolean> {
		return (await this.prisma.project.count({ where: { id: projectId, user_id: userId } })) > 0;
	}
}
