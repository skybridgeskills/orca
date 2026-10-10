import { beforeEach, describe, expect, it, vi } from 'vitest';

// P3: prove the members-list load gates by membership + profileVisibility when a
// membership achievement is configured, and stays open (today's behavior) when not.
// Only the IO boundary (prisma) is mocked; the real permissions helpers run.

const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserCount = vi.hoisted(() => vi.fn());
const mockClaimFindMany = vi.hoisted(() => vi.fn());
const mockClaimFindFirst = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		user: { findMany: mockUserFindMany, count: mockUserCount },
		achievementClaim: { findMany: mockClaimFindMany, findFirst: mockClaimFindFirst }
	}
}));

import { load } from './+page.server';

const MEMBERSHIP_ID = 'ach-member';
const GATED_ORG = {
	id: 'org-1',
	json: { permissions: { membershipAchievement: { requiresAchievement: MEMBERSHIP_ID } } }
};
const OPEN_ORG = { id: 'org-1', json: {} };

function makeEvent(org: unknown, user: unknown, query = '') {
	return {
		url: new URL(`https://x.test/members${query}`),
		locals: { org, session: user ? { user } : null }
	} as unknown as Parameters<typeof load>[0];
}

function user(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		givenName: 'G',
		familyName: 'F',
		organizationId: 'org-1',
		orgRole: null,
		profileVisibility: 'COMMUNITY',
		...overrides
	};
}

describe('members list load: membership + visibility gating', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUserCount.mockResolvedValue(0);
		mockClaimFindMany.mockResolvedValue([]);
		mockClaimFindFirst.mockResolvedValue(null);
	});

	it('unset config → open: all org users, every row linkable, no membership filter', async () => {
		const rows = [user('a'), user('b')];
		mockUserFindMany.mockResolvedValue(rows);
		mockUserCount.mockResolvedValue(2);

		const result = (await load(makeEvent(OPEN_ORG, user('viewer', { orgRole: null })))) as {
			members: { id: string; linkable: boolean }[];
		};

		// where is plain org-scope only (no receivedAchievementClaims filter).
		const where = mockUserFindMany.mock.calls[0][0].where;
		expect(where).toEqual({ organizationId: 'org-1' });
		expect(mockUserCount.mock.calls[0][0].where).toEqual(where);
		// No batched membership query when open.
		expect(mockClaimFindMany).not.toHaveBeenCalled();
		expect(result.members.every((m) => m.linkable)).toBe(true);
		expect(result.members).toHaveLength(2);
	});

	it('member (non-admin) viewer: query filters to visible members OR self; rows linkable', async () => {
		mockUserFindMany.mockResolvedValue([user('viewer'), user('other')]);
		mockUserCount.mockResolvedValue(2);
		// isMember(viewer) → has a valid claim.
		mockClaimFindFirst.mockResolvedValue({ id: 'claim-1' });

		const viewer = user('viewer', { orgRole: null });
		const result = (await load(makeEvent(GATED_ORG, viewer))) as {
			members: { id: string; linkable: boolean }[];
		};

		const where = mockUserFindMany.mock.calls[0][0].where;
		expect(where.organizationId).toBe('org-1');
		expect(where.receivedAchievementClaims.some.achievementId).toBe(MEMBERSHIP_ID);
		expect(where.OR).toEqual([
			{ id: 'viewer' },
			{ profileVisibility: { in: ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT'] } }
		]);
		// findMany + count share the identical where.
		expect(mockUserCount.mock.calls[0][0].where).toEqual(where);
		// Member viewer's list is pre-filtered → all linkable. No batched admin query.
		expect(mockClaimFindMany).not.toHaveBeenCalled();
		expect(result.members.every((m) => m.linkable)).toBe(true);
	});

	it('non-member viewer (gated) → redirected to /', async () => {
		// isMember(viewer) → no valid claim.
		mockClaimFindFirst.mockResolvedValue(null);
		await expect(
			load(makeEvent(GATED_ORG, user('viewer', { orgRole: null })))
		).rejects.toMatchObject({ status: 302, location: '/' });
		expect(mockUserFindMany).not.toHaveBeenCalled();
	});

	it('admin viewer (gated): sees all org users; non-members + hidden marked non-linkable', async () => {
		const rows = [
			user('admin', { orgRole: 'GENERAL_ADMIN', profileVisibility: 'PRIVATE' }), // self → linkable
			user('m-visible', { profileVisibility: 'COMMUNITY' }), // member + visible → linkable
			user('m-hidden', { profileVisibility: 'PRIVATE' }), // member but hidden → not linkable
			user('non-member', { profileVisibility: 'COMMUNITY' }) // not a member → not linkable
		];
		mockUserFindMany.mockResolvedValue(rows);
		mockUserCount.mockResolvedValue(4);
		// Batched membership lookup: admin self, m-visible, m-hidden are members.
		mockClaimFindMany.mockResolvedValue([
			{ userId: 'admin' },
			{ userId: 'm-visible' },
			{ userId: 'm-hidden' }
		]);

		const admin = user('admin', { orgRole: 'GENERAL_ADMIN' });
		const result = (await load(makeEvent(GATED_ORG, admin))) as {
			members: { id: string; linkable: boolean }[];
		};

		// Admin's list query is unfiltered org-scope (sees everyone).
		const where = mockUserFindMany.mock.calls[0][0].where;
		expect(where).toEqual({ organizationId: 'org-1' });
		expect(mockUserCount.mock.calls[0][0].where).toEqual(where);
		// Exactly one batched membership query over the page user ids.
		expect(mockClaimFindMany).toHaveBeenCalledTimes(1);
		const link = Object.fromEntries(result.members.map((m) => [m.id, m.linkable]));
		expect(link).toEqual({
			admin: true, // self, even though PRIVATE
			'm-visible': true,
			'm-hidden': false, // member but not visible and not self
			'non-member': false // visible but not a member
		});
	});
});

describe('members list load: search (?q=)', () => {
	type Group = { OR: Record<string, unknown>[] };

	beforeEach(() => {
		vi.clearAllMocks();
		mockUserFindMany.mockResolvedValue([]);
		mockUserCount.mockResolvedValue(0);
		mockClaimFindMany.mockResolvedValue([]);
		mockClaimFindFirst.mockResolvedValue(null);
	});

	it('no q → directory where alone, paged as before; q is empty', async () => {
		const result = (await load(makeEvent(OPEN_ORG, user('viewer'), '?page=2&pageSize=10'))) as {
			q: string;
		};
		const args = mockUserFindMany.mock.calls[0][0];
		expect(args.where).toEqual({ organizationId: 'org-1' });
		expect(args).toMatchObject({ skip: 10, take: 10 });
		expect(result.q).toBe('');
	});

	it('q (open org, non-admin) → directory AND names only; first 20, page ignored', async () => {
		const result = (await load(makeEvent(OPEN_ORG, user('viewer'), '?q=jane&page=3'))) as {
			q: string;
		};
		const args = mockUserFindMany.mock.calls[0][0];
		expect(args.where.AND[0]).toEqual({ organizationId: 'org-1' });
		expect(JSON.stringify(args.where.AND[1])).not.toContain('identifiers');
		expect(args).toMatchObject({ skip: 0, take: 20 });
		expect(mockUserCount.mock.calls[0][0].where).toEqual(args.where);
		expect(result.q).toBe('jane');
	});

	it('admin + q → search matches emails in this org', async () => {
		await load(makeEvent(OPEN_ORG, user('admin', { orgRole: 'GENERAL_ADMIN' }), '?q=jane@'));
		const search = mockUserFindMany.mock.calls[0][0].where.AND[1] as { AND: Group[] };
		expect(search.AND[0].OR[2]).toMatchObject({
			identifiers: { some: { organizationId: 'org-1', type: 'EMAIL' } }
		});
	});

	it('gated member + q → directory part keeps the visible-or-self filter', async () => {
		mockClaimFindFirst.mockResolvedValue({ id: 'claim-1' });
		await load(makeEvent(GATED_ORG, user('viewer'), '?q=jane'));
		const directory = mockUserFindMany.mock.calls[0][0].where.AND[0];
		expect(directory.OR).toEqual([
			{ id: 'viewer' },
			{ profileVisibility: { in: ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT'] } }
		]);
	});

	it('gated non-member + q → redirected to /', async () => {
		await expect(load(makeEvent(GATED_ORG, user('viewer'), '?q=jane'))).rejects.toMatchObject({
			status: 302,
			location: '/'
		});
		expect(mockUserFindMany).not.toHaveBeenCalled();
	});
});
