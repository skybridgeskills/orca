import { ClaimStatus, Visibility } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCount = vi.hoisted(() => vi.fn());
const mockResolveApiAuth = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievementClaim: { findMany: mockFindMany, count: mockCount }
	}
}));

vi.mock('$lib/server/oauth/apiAuth', () => ({
	resolveApiAuth: mockResolveApiAuth
}));

// Pass the rows straight through so we can assert on what the handler returns.
vi.mock('$lib/utils/api', () => ({
	apiResponse: vi.fn(async ({ data }: { data: unknown }) => data)
}));

import { GET } from './+server';

const ORG = { id: 'org-1' } as App.Organization;
const OWNER_ID = 'user-owner';
const OTHER_ID = 'user-other';
const ADMIN_ID = 'user-admin';

function row(id: string, userId: string, visibility: Visibility) {
	return {
		id,
		userId,
		organizationId: 'org-1',
		visibility,
		claimStatus: ClaimStatus.ACCEPTED
	};
}

// Simulate DB-level filtering: apply the OR fragment the handler builds so the
// test exercises the real `where` rather than a hand-waved stub.
const ALL_ROWS = [
	row('c-public', OWNER_ID, Visibility.PUBLIC),
	row('c-community', OWNER_ID, Visibility.COMMUNITY),
	row('c-achievement', OWNER_ID, Visibility.ACHIEVEMENT),
	row('c-private-other', OWNER_ID, Visibility.PRIVATE),
	row('c-private-mine', OTHER_ID, Visibility.PRIVATE)
];

function applyWhere(where: Record<string, unknown>) {
	return ALL_ROWS.filter((r) => {
		if (where.OR) {
			const ors = where.OR as Array<Record<string, unknown>>;
			return ors.some((o) => {
				if ('userId' in o) return r.userId === o.userId;
				if ('visibility' in o) {
					const inList = (o.visibility as { in: Visibility[] }).in;
					return inList.includes(r.visibility);
				}
				return false;
			});
		}
		// admin / no visibility restriction
		return true;
	});
}

function makeEvent(session: App.SessionData | null) {
	return {
		request: new Request('https://example.com/api/achievementClaims?achievementId=ach-1'),
		url: new URL('https://example.com/api/achievementClaims?achievementId=ach-1'),
		params: {},
		locals: { org: ORG, session }
	} as unknown as Parameters<typeof GET>[0];
}

function session(userId: string, orgRole?: string): App.SessionData {
	return {
		user: { id: userId, organizationId: 'org-1', orgRole: orgRole ?? null }
	} as App.SessionData;
}

describe('GET /api/achievementClaims visibility filtering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResolveApiAuth.mockResolvedValue({ ok: true });
		mockCount.mockResolvedValue(0);
		mockFindMany.mockImplementation(async ({ where }) => applyWhere(where));
	});

	it('community viewer does not receive others PRIVATE rows', async () => {
		const data = (await GET(makeEvent(session(OTHER_ID, 'MEMBER')))) as unknown as Array<{
			id: string;
			visibility: Visibility;
		}>;
		const ids = data.map((r) => r.id);
		// sees PUBLIC/COMMUNITY/ACHIEVEMENT and own PRIVATE, not the owner's PRIVATE
		expect(ids).toContain('c-public');
		expect(ids).toContain('c-community');
		expect(ids).toContain('c-achievement');
		expect(ids).toContain('c-private-mine');
		expect(ids).not.toContain('c-private-other');
	});

	it('owner receives their own PRIVATE rows', async () => {
		const data = (await GET(makeEvent(session(OWNER_ID, 'MEMBER')))) as unknown as Array<{
			id: string;
		}>;
		const ids = data.map((r) => r.id);
		expect(ids).toContain('c-private-other'); // owner of that claim
	});

	it('admin receives every row regardless of visibility', async () => {
		const data = (await GET(makeEvent(session(ADMIN_ID, 'GENERAL_ADMIN')))) as unknown as Array<{
			id: string;
		}>;
		const ids = data.map((r) => r.id);
		expect(ids).toEqual([
			'c-public',
			'c-community',
			'c-achievement',
			'c-private-other',
			'c-private-mine'
		]);
		// admin gets an empty visibility fragment, so no OR is added
		expect(mockFindMany.mock.calls[0][0].where.OR).toBeUndefined();
	});

	it('returned rows include the visibility field', async () => {
		const data = (await GET(makeEvent(session(ADMIN_ID, 'GENERAL_ADMIN')))) as unknown as Array<{
			visibility?: Visibility;
		}>;
		expect(data.length).toBeGreaterThan(0);
		for (const r of data) {
			expect(r.visibility).toBeDefined();
		}
	});

	it('ANDs the visibility fragment with org and status scoping', async () => {
		await GET(makeEvent(session(OTHER_ID, 'MEMBER')));
		const where = mockFindMany.mock.calls[0][0].where;
		expect(where.organizationId).toBe('org-1');
		expect(where.achievementId).toBe('ach-1');
		expect(where.claimStatus).toEqual({ in: ['ACCEPTED', 'UNACCEPTED'] });
		expect(where.OR).toBeDefined();
	});
});
