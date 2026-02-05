import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOrganizationFromRequest } from '../../../src/hooks.server';
import { prisma } from '../../../src/prisma/client';
import { testOrganization } from '../testObjects';

vi.mock('../../../src/prisma/client', () => ({
	prisma: {
		organization: {
			findMany: vi.fn()
		}
	}
}));

vi.mock('$env/static/private', () => ({
	DEFAULT_ORG_ENABLED: 'false',
	DEFAULT_ORG_DOMAIN: null
}));

describe('getOrganizationFromRequest', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should throw 503 error when organization is suspended', async () => {
		const suspendedOrg = {
			...testOrganization,
			json: JSON.stringify({ orgStatus: 'SUSPENDED' })
		};

		vi.mocked(prisma.organization.findMany).mockResolvedValue([suspendedOrg]);

		const event = {
			url: { host: 'example.com' }
		} as any;

		// Check that error is 503
		try {
			await getOrganizationFromRequest(event);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(503);
			const errorBody = typeof err.body === 'string' ? err.body : JSON.stringify(err.body);
			expect(errorBody).toContain('suspended');
		}
	});

	it('should return organization when orgStatus is ENABLED', async () => {
		const enabledOrg = {
			...testOrganization,
			json: JSON.stringify({ orgStatus: 'ENABLED' })
		};

		vi.mocked(prisma.organization.findMany).mockResolvedValue([enabledOrg]);

		const event = {
			url: { host: 'example.com' }
		} as any;

		const result = await getOrganizationFromRequest(event);
		expect(result).toEqual(enabledOrg);
	});

	it('should treat missing orgStatus as ENABLED', async () => {
		const orgWithoutStatus = {
			...testOrganization,
			json: JSON.stringify({})
		};

		vi.mocked(prisma.organization.findMany).mockResolvedValue([orgWithoutStatus]);

		const event = {
			url: { host: 'example.com' }
		} as any;

		const result = await getOrganizationFromRequest(event);
		expect(result).toEqual(orgWithoutStatus);
	});

	it('should allow access for UNDER_REVIEW status', async () => {
		const underReviewOrg = {
			...testOrganization,
			json: JSON.stringify({ orgStatus: 'UNDER_REVIEW' })
		};

		vi.mocked(prisma.organization.findMany).mockResolvedValue([underReviewOrg]);

		const event = {
			url: { host: 'example.com' }
		} as any;

		const result = await getOrganizationFromRequest(event);
		expect(result).toEqual(underReviewOrg);
	});

	it('should not allow access for PENDING status', async () => {
		const notActivatedOrg = {
			...testOrganization,
			json: JSON.stringify({ orgStatus: 'PENDING' })
		};

		vi.mocked(prisma.organization.findMany).mockResolvedValue([notActivatedOrg]);

		const event = {
			url: { host: 'example.com' }
		} as any;

		// Check that error is 403
		try {
			await getOrganizationFromRequest(event);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			const errorBody = typeof err.body === 'string' ? err.body : JSON.stringify(err.body);
			expect(errorBody).toContain('not yet activated');
		}
	});
});
