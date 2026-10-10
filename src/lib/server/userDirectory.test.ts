import { beforeEach, describe, expect, it, vi } from 'vitest';

// Only the IO boundary (prisma) is mocked; the real permissions helpers run.
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockClaimFindFirst = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		user: { findMany: mockUserFindMany },
		achievementClaim: { findFirst: mockClaimFindFirst }
	}
}));

import {
	getUserSummaries,
	toUserSummary,
	userDirectoryWhere,
	userSearchWhere
} from './userDirectory';

const MEMBERSHIP_ID = 'ach-member';
const GATED_ORG = {
	id: 'org-1',
	json: { permissions: { membershipAchievement: { requiresAchievement: MEMBERSHIP_ID } } }
} as unknown as { id: string; json: App.OrganizationConfig };
const OPEN_ORG = { id: 'org-1', json: {} } as { id: string; json: App.OrganizationConfig };

const member = { id: 'viewer', orgRole: null };
const admin = { id: 'admin', orgRole: 'GENERAL_ADMIN' };

describe('userDirectoryWhere', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockClaimFindFirst.mockResolvedValue(null);
	});

	it('not gated → org scope only', async () => {
		expect(await userDirectoryWhere({ viewer: member, org: OPEN_ORG })).toEqual({
			organizationId: 'org-1'
		});
	});

	it('gated + admin → org scope only', async () => {
		expect(await userDirectoryWhere({ viewer: admin, org: GATED_ORG })).toEqual({
			organizationId: 'org-1'
		});
	});

	it('gated + non-admin non-member → null', async () => {
		expect(await userDirectoryWhere({ viewer: member, org: GATED_ORG })).toBeNull();
	});

	it('gated + non-admin member → visible members or self', async () => {
		mockClaimFindFirst.mockResolvedValue({ id: 'claim-1' });
		const where = await userDirectoryWhere({ viewer: member, org: GATED_ORG });
		expect(where?.organizationId).toBe('org-1');
		expect(
			(where?.receivedAchievementClaims as { some: { achievementId: string } }).some.achievementId
		).toBe(MEMBERSHIP_ID);
		expect(where?.OR).toEqual([
			{ id: 'viewer' },
			{ profileVisibility: { in: ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT'] } }
		]);
	});
});

describe('userSearchWhere', () => {
	const opts = { orgId: 'org-1', includeEmail: false };
	type Group = { OR: Record<string, unknown>[] };
	const groups = (w: ReturnType<typeof userSearchWhere>) => (w.AND ?? []) as Group[];

	it('empty or whitespace → {}', () => {
		expect(userSearchWhere('', opts)).toEqual({});
		expect(userSearchWhere('   \t ', opts)).toEqual({});
	});

	it('one AND group per word, matching names case-insensitively', () => {
		const g = groups(userSearchWhere('  Jane   Doe ', opts));
		expect(g).toHaveLength(2);
		expect(g[0].OR).toEqual([
			{ givenName: { contains: 'Jane', mode: 'insensitive' } },
			{ familyName: { contains: 'Jane', mode: 'insensitive' } }
		]);
		expect(g[1].OR[0]).toEqual({ givenName: { contains: 'Doe', mode: 'insensitive' } });
	});

	it('keeps at most 5 words', () => {
		expect(groups(userSearchWhere('a b c d e f', opts))).toHaveLength(5);
	});

	it('cuts the query to 100 characters', () => {
		const g = groups(userSearchWhere('x'.repeat(150), opts));
		expect(g).toHaveLength(1);
		expect(g[0].OR[0]).toEqual({ givenName: { contains: 'x'.repeat(100), mode: 'insensitive' } });
	});

	it('no email clause unless includeEmail', () => {
		expect(JSON.stringify(userSearchWhere('jane', opts))).not.toContain('identifiers');
	});

	it('email clause scoped to the org and EMAIL identifiers', () => {
		const g = groups(userSearchWhere('jane@', { orgId: 'org-1', includeEmail: true }));
		expect(g[0].OR[2]).toEqual({
			identifiers: {
				some: {
					organizationId: 'org-1',
					type: 'EMAIL',
					identifier: { contains: 'jane@', mode: 'insensitive' }
				}
			}
		});
	});
});

describe('toUserSummary', () => {
	const base = { id: 'u1', givenName: 'Jane', familyName: 'Doe' };

	it('prefers a verified email', () => {
		const row = {
			...base,
			identifiers: [
				{ identifier: 'a@x.test', verifiedAt: null },
				{ identifier: 'b@x.test', verifiedAt: new Date() }
			]
		};
		expect(toUserSummary(row, { includeEmail: true }).email).toBe('b@x.test');
	});

	it('falls back to the first unverified email', () => {
		const row = { ...base, identifiers: [{ identifier: 'a@x.test', verifiedAt: null }] };
		expect(toUserSummary(row, { includeEmail: true }).email).toBe('a@x.test');
	});

	it('null when there is no email', () => {
		expect(toUserSummary({ ...base, identifiers: [] }, { includeEmail: true }).email).toBeNull();
	});

	it('no email key when not allowed', () => {
		const row = { ...base, identifiers: [{ identifier: 'a@x.test', verifiedAt: null }] };
		const summary = toUserSummary(row, { includeEmail: false });
		expect(summary).toEqual(base);
		expect('email' in summary).toBe(false);
	});
});

describe('getUserSummaries', () => {
	beforeEach(() => vi.clearAllMocks());

	it('no ids → [] without a query', async () => {
		expect(await getUserSummaries({ orgId: 'org-1', ids: [], includeEmail: false })).toEqual([]);
		expect(mockUserFindMany).not.toHaveBeenCalled();
	});

	it('org-scoped, deduped, in ids order, skipping missing ids', async () => {
		mockUserFindMany.mockResolvedValue([
			{ id: 'b', givenName: 'B', familyName: null },
			{ id: 'a', givenName: 'A', familyName: null }
		]);
		const result = await getUserSummaries({
			orgId: 'org-1',
			ids: ['a', 'gone', 'b', 'a'],
			includeEmail: false
		});
		expect(mockUserFindMany.mock.calls[0][0].where).toEqual({
			organizationId: 'org-1',
			id: { in: ['a', 'gone', 'b'] }
		});
		expect(result.map((u) => u.id)).toEqual(['a', 'b']);
	});

	it('selects only this org’s EMAIL identifiers when includeEmail', async () => {
		mockUserFindMany.mockResolvedValue([]);
		await getUserSummaries({ orgId: 'org-1', ids: ['a'], includeEmail: true });
		expect(mockUserFindMany.mock.calls[0][0].select.identifiers.where).toEqual({
			organizationId: 'org-1',
			type: 'EMAIL'
		});
	});
});
