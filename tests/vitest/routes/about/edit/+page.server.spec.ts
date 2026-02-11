import { describe, it, expect, beforeEach, vi } from 'vitest';
import { actions } from '../../../../../src/routes/about/edit/+page.server';
import { prisma } from '../../../../../src/prisma/client';
import { testOrganization } from '../../../testObjects';

vi.mock('../../../../../src/prisma/client', () => ({
	prisma: {
		organization: {
			update: vi.fn(),
			findFirst: vi.fn()
		},
		achievement: {
			findFirst: vi.fn()
		}
	}
}));

vi.mock('../../../../../src/lib/server/media', () => ({
	getUploadUrl: vi.fn().mockResolvedValue('')
}));

vi.mock('dotenv', async () => {
	const actual = await vi.importActual('dotenv') as Record<string, string | undefined>;
	return {
		...actual,
		default: {
			config: vi.fn()
		}
	};
});

vi.mock('../../../../../src/routes/about/edit/schema', () => ({
	formSchema: {
		validate: vi.fn().mockResolvedValue({})
	}
}));

vi.mock('../../../../../src/lib/utils/stripTags', () => ({
	default: (str: string) => str
}));

describe('organization edit action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should preserve orgStatus when updating organization', async () => {
		const orgWithStatus = {
			...testOrganization,
			json: JSON.stringify({ orgStatus: 'SUSPENDED', tagline: 'Old tagline' })
		};

		const updatedOrg = {
			...orgWithStatus,
			json: JSON.stringify({ orgStatus: 'SUSPENDED', tagline: 'New tagline' })
		};

		const locals = {
			org: orgWithStatus,
			session: { user: { orgRole: 'GENERAL_ADMIN' } }
		};

		const formData = new FormData();
		formData.append('name', 'Updated Name');
		formData.append('description', 'Updated Description');
		formData.append('tagline', 'New tagline');
		formData.append('imageEdited', 'false');

		const request = {
			formData: async () => formData
		} as any;

		vi.mocked(prisma.organization.update).mockResolvedValue(updatedOrg);

		const action = actions.default;
		await action({ locals, cookies: {}, request } as any);

		expect(prisma.organization.update).toHaveBeenCalledWith({
			where: { id: orgWithStatus.id },
			data: expect.objectContaining({
				json: expect.objectContaining({
					orgStatus: 'SUSPENDED'
				})
			})
		});
	});

	it('should default orgStatus to ENABLED when missing', async () => {
		const orgWithoutStatus = {
			...testOrganization,
			json: JSON.stringify({ tagline: 'Old tagline' })
		};

		const locals = {
			org: orgWithoutStatus,
			session: { user: { orgRole: 'GENERAL_ADMIN' } }
		};

		const formData = new FormData();
		formData.append('name', 'Updated Name');
		formData.append('description', 'Updated Description');
		formData.append('tagline', 'New tagline');
		formData.append('imageEdited', 'false');

		const request = {
			formData: async () => formData
		} as any;

		vi.mocked(prisma.organization.update).mockResolvedValue(orgWithoutStatus);

		const action = actions.default;
		await action({ locals, cookies: {}, request } as any);

		expect(prisma.organization.update).toHaveBeenCalledWith({
			where: { id: orgWithoutStatus.id },
			data: expect.objectContaining({
				json: expect.objectContaining({
					orgStatus: 'ENABLED'
				})
			})
		});
	});

	it('should ignore orgStatus from form data', async () => {
		const orgWithStatus = {
			...testOrganization,
			json: JSON.stringify({ orgStatus: 'SUSPENDED', tagline: 'Old tagline' })
		};

		const locals = {
			org: orgWithStatus,
			session: { user: { orgRole: 'GENERAL_ADMIN' } }
		};

		const formData = new FormData();
		formData.append('name', 'Updated Name');
		formData.append('description', 'Updated Description');
		formData.append('tagline', 'New tagline');
		formData.append('orgStatus', 'ENABLED'); // Attempt to change status
		formData.append('imageEdited', 'false');

		const request = {
			formData: async () => formData
		} as any;

		vi.mocked(prisma.organization.update).mockResolvedValue(orgWithStatus);

		const action = actions.default;
		await action({ locals, cookies: {}, request } as any);

		// Verify that orgStatus remains SUSPENDED, not ENABLED
		expect(prisma.organization.update).toHaveBeenCalledWith({
			where: { id: orgWithStatus.id },
			data: expect.objectContaining({
				json: expect.objectContaining({
					orgStatus: 'SUSPENDED' // Should remain SUSPENDED, not changed to ENABLED
				})
			})
		});
	});
});
