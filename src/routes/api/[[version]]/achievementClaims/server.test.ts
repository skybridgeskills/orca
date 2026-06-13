import { ClaimStatus, Visibility } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCount = vi.hoisted(() => vi.fn());
const mockResolveApiAuth = vi.hoisted(() => vi.fn());
const mockIsMember = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievementClaim: { findMany: mockFindMany, count: mockCount }
	}
}));

vi.mock('$lib/server/oauth/apiAuth', () => ({
	resolveApiAuth: mockResolveApiAuth
}));

// Reuse the real claimVisibility module (COMMUNITY_VISIBLE threshold). Mock only
// the membership helpers — they would otherwise hit prisma — while keeping
// `membershipAchievementId` reading `org.json` so gating is driven by the fixture.
vi.mock('$lib/server/permissions', () => ({
	isMember: mockIsMember,
	membershipAchievementId: (org: { json?: App.OrganizationConfig }) =>
		org.json?.permissions?.membershipAchievement?.requiresAchievement ?? null,
	validMembershipClaimWhere: (achievementId: string, orgId: string) => ({
		achievementId,
		organizationId: orgId
	})
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
		claimStatus: ClaimStatus.ACCEPTED,
		// P4: the handler now reads `user.profileVisibility` when computing
		// `profileLinkable`; include it so the existing (unset-gating) suite stays
		// representative of a real row shape.
		user: { id: userId, profileVisibility: Visibility.COMMUNITY }
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

	it('unset gating: every returned row is profileLinkable and no membership query runs', async () => {
		const data = (await GET(makeEvent(session(OTHER_ID, 'MEMBER')))) as unknown as Array<{
			profileLinkable: boolean;
		}>;
		expect(data.length).toBeGreaterThan(0);
		for (const r of data) expect(r.profileLinkable).toBe(true);
		// gating off → membership never consulted, only the claims page query runs.
		expect(mockIsMember).not.toHaveBeenCalled();
		expect(mockFindMany).toHaveBeenCalledTimes(1);
	});
});

// P4: membership gate + per-row `profileLinkable` (one batched IN query per page).
const MEMBERSHIP_ID = 'ach-membership';
const GATED_ORG = {
	id: 'org-1',
	json: { permissions: { membershipAchievement: { requiresAchievement: MEMBERSHIP_ID } } }
} as unknown as App.Organization;

function gatedRow(id: string, userId: string, profileVisibility: Visibility) {
	return {
		id,
		userId,
		organizationId: 'org-1',
		visibility: Visibility.PUBLIC,
		claimStatus: ClaimStatus.ACCEPTED,
		user: { id: userId, profileVisibility }
	};
}

function gatedEvent(s: App.SessionData | null) {
	return {
		request: new Request('https://example.com/api/achievementClaims?achievementId=ach-1'),
		url: new URL('https://example.com/api/achievementClaims?achievementId=ach-1'),
		params: {},
		locals: { org: GATED_ORG, session: s }
	} as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/achievementClaims membership gating + profileLinkable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResolveApiAuth.mockResolvedValue({ ok: true });
		mockCount.mockResolvedValue(0);
	});

	it('admin viewer → all rows linkable, at most one batched membership query', async () => {
		mockIsMember.mockResolvedValue(true); // admin always a member
		mockFindMany.mockResolvedValueOnce([
			gatedRow('c1', 'u1', Visibility.PRIVATE),
			gatedRow('c2', 'u2', Visibility.PUBLIC)
		]);

		const data = (await GET(gatedEvent(session(ADMIN_ID, 'GENERAL_ADMIN')))) as unknown as Array<{
			profileLinkable: boolean;
		}>;

		expect(data.map((r) => r.profileLinkable)).toEqual([true, true]);
		const membershipCalls = mockFindMany.mock.calls.filter(
			(c) => c[0]?.where?.achievementId === MEMBERSHIP_ID
		);
		expect(membershipCalls.length).toBeLessThanOrEqual(1);
	});

	it('member claimant + community-visible → linkable; PRIVATE or non-member → not', async () => {
		mockIsMember.mockResolvedValue(true); // non-admin member viewer
		mockFindMany
			.mockResolvedValueOnce([
				gatedRow('c1', 'u1', Visibility.PUBLIC),
				gatedRow('c2', 'u2', Visibility.PRIVATE),
				gatedRow('c3', 'u3', Visibility.COMMUNITY)
			])
			// ONE batched membership query: u1 + u2 are members, u3 is not.
			.mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }]);

		const data = (await GET(gatedEvent(session('viewer', 'MEMBER')))) as unknown as Array<{
			id: string;
			profileLinkable: boolean;
		}>;

		expect(data.find((r) => r.id === 'c1')!.profileLinkable).toBe(true); // member + visible
		expect(data.find((r) => r.id === 'c2')!.profileLinkable).toBe(false); // member + PRIVATE
		expect(data.find((r) => r.id === 'c3')!.profileLinkable).toBe(false); // visible + non-member
	});

	it('exactly ONE extra batched IN query per page (O(1), distinct user ids)', async () => {
		mockIsMember.mockResolvedValue(true);
		mockFindMany
			.mockResolvedValueOnce([
				gatedRow('c1', 'u1', Visibility.PUBLIC),
				gatedRow('c2', 'u2', Visibility.PUBLIC),
				gatedRow('c3', 'u1', Visibility.PUBLIC) // duplicate claimant
			])
			.mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }]);

		await GET(gatedEvent(session('viewer', 'MEMBER')));

		expect(mockFindMany).toHaveBeenCalledTimes(2); // page query + one IN query
		const membershipCall = mockFindMany.mock.calls[1][0];
		expect(membershipCall.where.userId.in).toEqual(['u1', 'u2']); // de-duplicated
		expect(membershipCall.where.achievementId).toBe(MEMBERSHIP_ID);
	});

	it('your own row is always linkable even when non-member / PRIVATE', async () => {
		mockIsMember.mockResolvedValue(true);
		mockFindMany
			.mockResolvedValueOnce([gatedRow('c1', 'me', Visibility.PRIVATE)])
			.mockResolvedValueOnce([]); // not a member of record

		const data = (await GET(gatedEvent(session('me', 'MEMBER')))) as unknown as Array<{
			profileLinkable: boolean;
		}>;
		expect(data[0].profileLinkable).toBe(true);
	});

	it('gated non-member → 403 and no claims query', async () => {
		mockIsMember.mockResolvedValue(false);

		await expect(GET(gatedEvent(session('outsider', 'MEMBER')))).rejects.toMatchObject({
			status: 403
		});
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	it('gated anonymous caller → 403', async () => {
		mockIsMember.mockResolvedValue(false);
		await expect(GET(gatedEvent(null))).rejects.toMatchObject({ status: 403 });
	});
});
