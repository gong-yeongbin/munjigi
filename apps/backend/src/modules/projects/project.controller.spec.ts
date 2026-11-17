import type { Actor } from '@/common/auth/decorators';
import { ProjectController } from './project.controller';
import type { ProjectService } from './project.service';

describe('ProjectController', () => {
	const service = {
		list: vi.fn().mockResolvedValue('page'),
		create: vi.fn().mockResolvedValue('created'),
		get: vi.fn().mockResolvedValue('project'),
		update: vi.fn().mockResolvedValue('updated'),
		remove: vi.fn().mockResolvedValue(undefined),
		getSigningSecret: vi.fn().mockResolvedValue('secret'),
		rotateSigningSecret: vi.fn().mockResolvedValue('rotated'),
	};
	const controller = new ProjectController(service as unknown as ProjectService);
	const actor: Actor = { kind: 'user', user_id: 1, project_id: null };

	it('주체의 user_id·경로·쿼리·본문을 service에 그대로 넘긴다', async () => {
		expect(await controller.list(actor, { limit: 50 })).toBe('page');
		expect(service.list).toHaveBeenCalledWith(1, { limit: 50 });

		expect(await controller.create(actor, { name: 'shop' })).toBe('created');
		expect(service.create).toHaveBeenCalledWith(1, { name: 'shop' });

		expect(await controller.get(actor, { projectId: 10 })).toBe('project');
		expect(service.get).toHaveBeenCalledWith(1, 10);

		expect(await controller.update(actor, { projectId: 10 }, { name: 'n' })).toBe('updated');
		expect(service.update).toHaveBeenCalledWith(1, 10, { name: 'n' });

		await controller.remove(actor, { projectId: 10 });
		expect(service.remove).toHaveBeenCalledWith(1, 10);

		expect(await controller.getSigningSecret(actor, { projectId: 10 })).toBe('secret');
		expect(service.getSigningSecret).toHaveBeenCalledWith(1, 10);

		expect(await controller.rotateSigningSecret(actor, { projectId: 10 })).toBe('rotated');
		expect(service.rotateSigningSecret).toHaveBeenCalledWith(1, 10);
	});
});
