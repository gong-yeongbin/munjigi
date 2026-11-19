import { Injectable } from '@nestjs/common';
import type { delivery, Plan } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { BulkRetryFilter, DeliveryApiRepository, DeliveryDetail, DeliveryFilter } from '../ports/delivery-api.repository';

@Injectable()
export class PrismaDeliveryApiRepository implements DeliveryApiRepository {
	constructor(private readonly prisma: PrismaService) {}

	list(projectId: number, filter: DeliveryFilter, cursor: bigint | null, take: number): Promise<delivery[]> {
		return this.prisma.delivery.findMany({
			where: {
				event: { project_id: projectId },
				status: filter.status,
				destination_id: filter.destination_id,
				event_id: filter.event_id,
				...(cursor === null ? {} : { id: { lt: cursor } }),
			},
			orderBy: { id: 'desc' },
			take,
		});
	}

	find(projectId: number, id: bigint): Promise<DeliveryDetail | null> {
		return this.prisma.delivery.findFirst({ where: { id, event: { project_id: projectId } }, include: { attempts: { orderBy: { attempt_no: 'asc' } } } });
	}

	async findHeld(projectId: number, id: bigint): Promise<{ paused: boolean } | null> {
		const row = await this.prisma.delivery.findFirst({
			where: { id, status: 'held', event: { project_id: projectId } },
			select: { connection: { select: { paused_at: true } }, event: { select: { project: { select: { suspended_at: true } } } } },
		});
		if (!row) return null;
		// 연결이 지워진 것은 멈춰 있지 않다. 워커가 canceled로 닫는다
		return { paused: (row.connection?.paused_at ?? null) !== null || row.event.project.suspended_at !== null };
	}

	async findOwner(projectId: number): Promise<{ user_id: number; plan: Plan }> {
		const { user } = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { user: { select: { id: true, plan: true } } } });
		return { user_id: user.id, plan: user.plan };
	}

	async markRetry(projectId: number, id: bigint): Promise<delivery | 'not_found' | 'pending'> {
		const [updated] = await this.prisma.delivery.updateManyAndReturn({
			where: { id, event: { project_id: projectId }, status: { not: 'pending' } },
			data: { status: 'pending', next_attempt_at: null },
		});
		if (updated) return updated;
		const current = await this.prisma.delivery.findFirst({ where: { id, event: { project_id: projectId } }, select: { id: true } });
		return current ? 'pending' : 'not_found';
	}

	async markBulkRetry(projectId: number, filter: BulkRetryFilter, limit: number): Promise<bigint[]> {
		const picked = await this.prisma.delivery.findMany({
			where: {
				// held는 지금 보낼 수 있는 것만. 연결이 멈춰 있거나 project가 정지돼 있으면 워커가 다시 보류한다
				event: filter.status === 'held' ? { project_id: projectId, project: { suspended_at: null } } : { project_id: projectId },
				...(filter.status === 'held' ? { OR: [{ connection_id: null }, { connection: { paused_at: null } }] } : {}),
				status: filter.status,
				destination_id: filter.destination_id,
				created_at: { gte: filter.created_after, lt: filter.created_before },
			},
			select: { id: true },
			orderBy: { id: 'asc' },
			take: limit,
		});
		if (picked.length === 0) return [];
		// 고르는 사이 상태가 바뀐 것은 건드리지 않는다
		const updated = await this.prisma.delivery.updateManyAndReturn({
			where: { id: { in: picked.map((row) => row.id) }, status: filter.status },
			data: { status: 'pending', next_attempt_at: null },
			select: { id: true },
		});
		return updated.map((row) => row.id);
	}

	async cancel(projectId: number, id: bigint): Promise<delivery | 'not_found' | 'closed'> {
		const [updated] = await this.prisma.delivery.updateManyAndReturn({
			where: { id, event: { project_id: projectId }, status: { in: ['pending', 'failed', 'held'] } },
			data: { status: 'canceled', next_attempt_at: null },
		});
		if (updated) return updated;
		const current = await this.prisma.delivery.findFirst({ where: { id, event: { project_id: projectId } }, select: { id: true } });
		return current ? 'closed' : 'not_found';
	}
}
