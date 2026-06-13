import { beforeEach, describe, expect, it, vi } from 'vitest';

// P3: prove the member-profile load gates access by membership + profileVisibility
// when a membership achievement is configured (self / admin / visible-member /
// hidden-member / non-member matrix), and stays open when unset. Only prisma is
// mocked; the real permissions helpers run.

const mockUserFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockClaimFindFirst = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		user: { findUniqueOrThrow: mockUserFindUniqueOrThrow },
		achievementClaim: { findFirst: mockClaimFindFirst }
	}
}));

import { load } from './+page.server';

const MEMBERSHIP_ID = 'ach-member';
const GATED_ORG = {
	id: 'org-1',
	json: { permissions: { membershipAchievement: { requiresAchievement: MEMBERSHIP_ID } } }
};
const OPEN_ORG = { id: 'org-1', json: {} };

function makeEvent(org: unknown, viewer: unknown, targetId: string) {
	return {
		url: new URL('https://x.test/members/' + targetId),
		params: { id: targetId },
		locals: { org, session: { user: viewer } }
	} as unknown as Parameters<typeof load>[0];
}

function viewerUser(id: string, overrides: Record<string, unknown> = {}) {
	return { id, orgRole: null, ...overrides };
}

async function loadProfile(event: Parameters<typeof load>[0]) {
	return (await load(event)) as { member: { id: string } };
}

function targetRow(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		organizationId: 'org-1',
		orgRole: null,
		profileVisibility: 'COMMUNITY',
		receivedAchievementClaims: [],
		identifiers: [],
		_count: { receivedAchievementClaims: 0 },
		...overrides
	};
}

describe('member profile load: access gating', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockClaimFindFirst.mockResolvedValue(null);
	});

	it('cross-org target → 404 (unchanged)', async () => {
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('t', { organizationId: 'other-org' }));
		await expect(load(makeEvent(GATED_ORG, viewerUser('v'), 't'))).rejects.toMatchObject({
			status: 404
		});
	});

	it('unset config → open: any same-org viewer may view, no membership query', async () => {
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('t', { profileVisibility: 'PRIVATE' }));
		const result = await loadProfile(makeEvent(OPEN_ORG, viewerUser('v'), 't'));
		expect(result.member.id).toBe('t');
		expect(mockClaimFindFirst).not.toHaveBeenCalled();
	});

	it('excludes PASSKEY identifiers from the profile identifier display', async () => {
		// The profile shows contact/identity identifiers only; PASSKEY rows are
		// authenticators and must be filtered out at the query level.
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('t'));
		await loadProfile(makeEvent(OPEN_ORG, viewerUser('v'), 't'));
		const include = mockUserFindUniqueOrThrow.mock.calls[0][0].include;
		expect(include.identifiers).toEqual({ where: { type: { not: 'PASSKEY' } } });
	});

	it('self → allowed even when hidden, no membership query', async () => {
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('me', { profileVisibility: 'PRIVATE' }));
		const result = await loadProfile(makeEvent(GATED_ORG, viewerUser('me'), 'me'));
		expect(result.member.id).toBe('me');
		expect(mockClaimFindFirst).not.toHaveBeenCalled();
	});

	it('admin viewer → allowed even for hidden non-member target', async () => {
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('t', { profileVisibility: 'PRIVATE' }));
		const result = await loadProfile(
			makeEvent(GATED_ORG, viewerUser('a', { orgRole: 'CONTENT_ADMIN' }), 't')
		);
		expect(result.member.id).toBe('t');
		expect(mockClaimFindFirst).not.toHaveBeenCalled();
	});

	it('member viewer + visible member target → allowed', async () => {
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('t', { profileVisibility: 'COMMUNITY' }));
		// Both viewer and target resolve as members.
		mockClaimFindFirst.mockResolvedValue({ id: 'claim' });
		const result = await loadProfile(makeEvent(GATED_ORG, viewerUser('v'), 't'));
		expect(result.member.id).toBe('t');
	});

	it('member viewer + hidden member target → redirected to /members', async () => {
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('t', { profileVisibility: 'PRIVATE' }));
		mockClaimFindFirst.mockResolvedValue({ id: 'claim' });
		await expect(load(makeEvent(GATED_ORG, viewerUser('v'), 't'))).rejects.toMatchObject({
			status: 302,
			location: '/members'
		});
	});

	it('member viewer + non-member target (visible) → redirected to /members', async () => {
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('t', { profileVisibility: 'COMMUNITY' }));
		// viewer is a member (first call), target is not (second call).
		mockClaimFindFirst.mockResolvedValueOnce({ id: 'claim' }).mockResolvedValueOnce(null);
		await expect(load(makeEvent(GATED_ORG, viewerUser('v'), 't'))).rejects.toMatchObject({
			status: 302,
			location: '/members'
		});
	});

	it('non-member viewer + visible member target → redirected to /members', async () => {
		mockUserFindUniqueOrThrow.mockResolvedValue(targetRow('t', { profileVisibility: 'COMMUNITY' }));
		// viewer membership lookup → null (not a member); short-circuits.
		mockClaimFindFirst.mockResolvedValue(null);
		await expect(load(makeEvent(GATED_ORG, viewerUser('v'), 't'))).rejects.toMatchObject({
			status: 302,
			location: '/members'
		});
	});
});
