import { error } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// P4 detail — the SECURITY-CRITICAL load. Proves:
//  - capability binding (message findFirst by id + userId + organizationId → 404),
//  - same-org (org-admin) read NEVER returns reporter identity,
//  - cross-org read is gated by requireSuperadminOrg (fail closed), loads origin-org
//    target + reporter identity, and the origin org is taken from report.originOrgId
//    (NOT input),
//  - cross-org DENIED (403) when not the superadmin org / env unset.
//
// We mock the IO boundary (prisma) and the superadmin guard. The guard is mocked to
// the REAL fail-closed contract (throws 403 unless org === superadmin org) via
// `superadminOrgId`.

const mockMessageFindFirst = vi.hoisted(() => vi.fn());
const mockUserFindFirst = vi.hoisted(() => vi.fn());
const mockAchievementFindFirst = vi.hoisted(() => vi.fn());
const mockClaimFindFirst = vi.hoisted(() => vi.fn());
const mockEndorsementFindFirst = vi.hoisted(() => vi.fn());
const mockModerationFindMany = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		message: { findFirst: mockMessageFindFirst },
		user: { findFirst: mockUserFindFirst },
		achievement: { findFirst: mockAchievementFindFirst },
		achievementClaim: { findFirst: mockClaimFindFirst },
		claimEndorsement: { findFirst: mockEndorsementFindFirst },
		moderationAction: { findMany: mockModerationFindMany }
	}
}));

// Mock the superadmin guard to its real fail-closed behaviour, keyed off a settable
// superadmin org id (stands in for SUPERADMIN_ORG_ID).
const superState = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('$lib/server/moderation/superadminOrg', () => ({
	superadminOrgId: () => superState.id,
	isSuperadminOrg: (orgId: string | null | undefined) => !!superState.id && orgId === superState.id,
	requireSuperadminOrg: (locals: App.Locals) => {
		if (!locals.session?.user?.id || !superState.id || locals.org?.id !== superState.id) {
			// mirror the real guard (throws a 403)
			throw error(403, 'Superadmin access required');
		}
	}
}));

import { load } from './+page.server';

const REPORTER = 'reporter-user-id';

function makeEvent(orgId: string, userId: string | undefined, id = 'msg-1') {
	return {
		params: { id },
		locals: {
			org: { id: orgId },
			session: userId ? { user: { id: userId } } : null
		}
	} as unknown as Parameters<typeof load>[0];
}

function reportRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 'rep-1',
		originOrgId: 'origin-org',
		targetType: 'ACHIEVEMENT',
		targetId: 'ach-1',
		reporterUserId: REPORTER,
		reporterStatus: 'MEMBER',
		reason: 'spam',
		description: 'bad',
		createdAt: new Date(),
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	superState.id = null;
	mockModerationFindMany.mockResolvedValue([]);
	mockAchievementFindFirst.mockResolvedValue({
		id: 'ach-1',
		name: 'Badge',
		description: 'desc',
		image: null
	});
	mockUserFindFirst.mockResolvedValue({
		id: REPORTER,
		givenName: 'Pat',
		familyName: 'Reporter'
	});
});

describe('messages detail load — capability binding', () => {
	it('redirects logged-out users to /', async () => {
		await expect(load(makeEvent('org-1', undefined))).rejects.toMatchObject({
			status: 302,
			location: '/'
		});
		expect(mockMessageFindFirst).not.toHaveBeenCalled();
	});

	it('404s when the message is not mine / not in this org (findFirst returns null)', async () => {
		mockMessageFindFirst.mockResolvedValue(null);
		await expect(load(makeEvent('org-1', 'me'))).rejects.toMatchObject({ status: 404 });
		// The capability binding query is id + userId + organizationId.
		expect(mockMessageFindFirst.mock.calls[0][0].where).toEqual({
			id: 'msg-1',
			userId: 'me',
			organizationId: 'org-1'
		});
	});

	it('renders a non-report message gracefully (report null)', async () => {
		mockMessageFindFirst.mockResolvedValue({
			id: 'msg-1',
			type: 'REVIEW_NEEDED',
			createdAt: new Date(),
			report: null
		});
		const result = (await load(makeEvent('org-1', 'me'))) as { report: null; target: null };
		expect(result.report).toBeNull();
		expect(result.target).toBeNull();
	});
});

describe('messages detail load — same-org (org admin) read', () => {
	it('omits reporter identity entirely and never queries the reporter user', async () => {
		// originOrgId === locals.org.id ⇒ same-org.
		mockMessageFindFirst.mockResolvedValue({
			id: 'msg-1',
			type: 'CONTENT_REPORTED',
			createdAt: new Date(),
			report: reportRow({ originOrgId: 'org-1' })
		});

		const result = (await load(makeEvent('org-1', 'admin'))) as {
			viewerIsSuperadmin: boolean;
			reporterIdentity: unknown;
			report: Record<string, unknown>;
		};

		expect(result.viewerIsSuperadmin).toBe(false);
		expect(result.reporterIdentity).toBeNull();
		// Reporter identity user lookup must NOT happen for a same-org viewer.
		expect(mockUserFindFirst).not.toHaveBeenCalled();
		// Sanitized report never carries reporterUserId.
		expect('reporterUserId' in result.report).toBe(false);
		expect(JSON.stringify(result)).not.toContain(REPORTER);
		// Target read is scoped to the origin org (= org-1 here).
		expect(mockAchievementFindFirst.mock.calls[0][0].where).toEqual({
			id: 'ach-1',
			organizationId: 'org-1'
		});
	});
});

describe('messages detail load — cross-org (superadmin) read', () => {
	it('loads origin-org target + reporter identity when org IS the superadmin org', async () => {
		superState.id = 'org-1'; // viewer's org === superadmin org
		mockMessageFindFirst.mockResolvedValue({
			id: 'msg-1',
			type: 'CONTENT_REPORTED',
			createdAt: new Date(),
			report: reportRow({ originOrgId: 'origin-org' }) // different org ⇒ cross-org
		});

		const result = (await load(makeEvent('org-1', 'superadmin'))) as {
			viewerIsSuperadmin: boolean;
			reporterIdentity: { id: string; name: string | null } | null;
		};

		expect(result.viewerIsSuperadmin).toBe(true);
		expect(result.reporterIdentity).toEqual({ id: REPORTER, name: 'Pat Reporter' });

		// Origin org is taken from report.originOrgId, NOT the viewer's org / any input.
		// Reporter lookup is scoped to the origin org.
		expect(mockUserFindFirst.mock.calls[0][0].where).toEqual({
			id: REPORTER,
			organizationId: 'origin-org'
		});
		// Target read is scoped to the origin org, not locals.org.
		expect(mockAchievementFindFirst.mock.calls[0][0].where).toEqual({
			id: 'ach-1',
			organizationId: 'origin-org'
		});
	});

	it('DENIES (403) cross-org when viewer org is NOT the superadmin org', async () => {
		superState.id = 'some-other-super-org'; // viewer org-1 is not it
		mockMessageFindFirst.mockResolvedValue({
			id: 'msg-1',
			type: 'CONTENT_REPORTED',
			createdAt: new Date(),
			report: reportRow({ originOrgId: 'origin-org' })
		});

		await expect(load(makeEvent('org-1', 'someadmin'))).rejects.toMatchObject({ status: 403 });
		// Fail closed BEFORE any cross-org reads.
		expect(mockUserFindFirst).not.toHaveBeenCalled();
		expect(mockAchievementFindFirst).not.toHaveBeenCalled();
	});

	it('DENIES (403) cross-org when superadmin org is unset (fail closed)', async () => {
		superState.id = null; // env unset
		mockMessageFindFirst.mockResolvedValue({
			id: 'msg-1',
			type: 'CONTENT_REPORTED',
			createdAt: new Date(),
			report: reportRow({ originOrgId: 'origin-org' })
		});

		await expect(load(makeEvent('org-1', 'someadmin'))).rejects.toMatchObject({ status: 403 });
		expect(mockUserFindFirst).not.toHaveBeenCalled();
		expect(mockAchievementFindFirst).not.toHaveBeenCalled();
	});
});
