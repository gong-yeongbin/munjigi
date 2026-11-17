import type { Actor } from '@/common/auth/decorators';
import { UsageController } from './usage.controller';
import type { UsageService } from './usage.service';

describe('UsageController', () => {
	const service = { get: vi.fn().mockResolvedValue('usage') };
	const controller = new UsageController(service as unknown as UsageService);

	it('get — 주체의 user_id를 넘긴다', async () => {
		const actor: Actor = { kind: 'user', user_id: 3, project_id: null };
		expect(await controller.get(actor)).toBe('usage');
		expect(service.get).toHaveBeenCalledWith(3);
	});
});
