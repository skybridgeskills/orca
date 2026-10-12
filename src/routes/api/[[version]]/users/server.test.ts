import { beforeEach, describe, expect, it, vi } from 'vitest';

// Only the IO boundary (prisma) is mocked; the real directory + permissions helpers run.
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserCount = vi.hoisted(() => vi.fn());
const mockClaimFindFirst = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		user: { findMany: mockUserFindMany, count: mockUserCount },
		achievementClaim: { findFirst: mockClaimFindFirst }
	}
}));

// Pass the rows straight through so we can assert on what the handler returns.
vi.mock('$lib/utils/api', () => ({
	apiResponse: vi.fn(async ({ data }: { data: unknown }) => data)
}));

import { GET } from './+server';

const GATED_ORG = {
	id: 'org-1',
	json: { permissions: { membershipAchievement: { requiresAchievement: 'ach-member' } } }
};
const OPEN_ORG = { id: 'org-1', json: {} };
const ADMIN = { id: 'admin', orgRole: 'GENERAL_ADMIN' };
const MEMBER = { id: 'viewer', orgRole: null };

function makeEvent(
	org: unknown,
	user: unknown,
	query = '',
	accept = 'application/json'
): Parameters<typeof GET>[0] {
	return {
		url: new URL(`https://x.test/api/v1/users${query}`),
		request: new Request('https://x.test/api/v1/users', { headers: { accept } }),
		params: { version: 'v1' },
		locals: { org, session: user ? { user } : null }
	} as unknown as Parameters<typeof GET>[0];
}

const ROW = {
	id: 'u1',
	givenName: 'Jane',
	familyName: 'Doe',
	identifiers: [{ identifier: 'jane@x.test', verifiedAt: new Date() }]
};

describe('GET /api/v1/users', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUserFindMany.mockResolvedValue([ROW]);
		mockUserCount.mockResolvedValue(1);
		mockClaimFindFirst.mockResolvedValue(null);
	});

	it('401 without a session', async () => {
		await expect(GET(makeEvent(OPEN_ORG, null))).rejects.toMatchObject({ status: 401 });
		expect(mockUserFindMany).not.toHaveBeenCalled();
	});

	it('403 for a gated non-admin non-member', async () => {
		await expect(GET(makeEvent(GATED_ORG, MEMBER, '?q=jane'))).rejects.toMatchObject({
			status: 403
		});
		expect(mockUserFindMany).not.toHaveBeenCalled();
	});

	it('HTML Accept → redirect to /members', async () => {
		await expect(GET(makeEvent(OPEN_ORG, MEMBER, '', 'text/html'))).rejects.toMatchObject({
			status: 302,
			location: '/members'
		});
	});

	it('every query is org-scoped', async () => {
		mockClaimFindFirst.mockResolvedValue({ id: 'claim-1' });
		for (const [org, user] of [
			[OPEN_ORG, MEMBER],
			[GATED_ORG, MEMBER],
			[GATED_ORG, ADMIN]
		] as const) {
			mockUserFindMany.mockClear();
			await GET(makeEvent(org, user, '?q=jane'));
			const where = mockUserFindMany.mock.calls[0][0].where;
			expect(where.AND[0].organizationId).toBe('org-1');
		}
	});

	it('admin: rows carry email; search matches on email', async () => {
		const data = (await GET(makeEvent(OPEN_ORG, ADMIN, '?q=jane@'))) as unknown as Array<{
			email?: string | null;
		}>;
		expect(data[0].email).toBe('jane@x.test');
		expect(JSON.stringify(mockUserFindMany.mock.calls[0][0].where)).toContain('identifiers');
	});

	it('non-admin: no email key; no email clause', async () => {
		mockUserFindMany.mockResolvedValue([{ id: 'u1', givenName: 'Jane', familyName: 'Doe' }]);
		const data = (await GET(makeEvent(OPEN_ORG, MEMBER, '?q=jane'))) as unknown as object[];
		expect('email' in data[0]).toBe(false);
		const call = mockUserFindMany.mock.calls[0][0];
		expect(JSON.stringify(call.where)).not.toContain('identifiers');
		expect(call.select.identifiers).toBeUndefined();
	});

	it('page size capped at 20; page offsets', async () => {
		await GET(makeEvent(OPEN_ORG, MEMBER, '?pageSize=500&page=3'));
		expect(mockUserFindMany.mock.calls[0][0]).toMatchObject({ take: 20, skip: 40 });
	});
});
