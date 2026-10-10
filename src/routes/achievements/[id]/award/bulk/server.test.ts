import { beforeEach, describe, expect, it, vi } from 'vitest';

// The bulk-award page is gated exactly like the single-award page: logged-out
// callers and callers who can't invite to the achievement are sent back to it.
// Only prisma is mocked; the real canInviteToAchievement runs.

const mockAchievementFindFirstOrThrow = vi.hoisted(() => vi.fn());
const mockClaimFindFirst = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievement: { findFirstOrThrow: mockAchievementFindFirstOrThrow },
		achievementClaim: { findFirst: mockClaimFindFirst }
	}
}));

import { load } from './+page.server';

const ACHIEVEMENT = {
	id: 'ach-1',
	organizationId: 'org-1',
	name: 'Trail Steward',
	json: {},
	_count: { achievementClaims: 0, claimEndorsements: 0 }
};

function makeEvent(user: unknown) {
	return {
		params: { id: 'ach-1' },
		locals: { org: { id: 'org-1' }, session: user ? { user } : null }
	} as unknown as Parameters<typeof load>[0];
}

describe('achievements/[id]/award/bulk load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAchievementFindFirstOrThrow.mockResolvedValue(ACHIEVEMENT);
		mockClaimFindFirst.mockResolvedValue(null);
	});

	it('redirects a logged-out visitor back to the achievement', async () => {
		await expect(load(makeEvent(null))).rejects.toMatchObject({
			status: 302,
			location: '/achievements/ach-1'
		});
		expect(mockAchievementFindFirstOrThrow).not.toHaveBeenCalled();
	});

	it('redirects a member who cannot invite to this achievement', async () => {
		await expect(load(makeEvent({ id: 'u1', orgRole: null }))).rejects.toMatchObject({
			status: 302,
			location: '/achievements/ach-1'
		});
	});

	it('redirects a member who lacks the invite-qualifying claim', async () => {
		mockAchievementFindFirstOrThrow.mockResolvedValue({
			...ACHIEVEMENT,
			json: { capabilities: { inviteRequires: 'ach-qual' } }
		});
		await expect(load(makeEvent({ id: 'u1', orgRole: null }))).rejects.toMatchObject({
			status: 302,
			location: '/achievements/ach-1'
		});
	});

	it('lets a member with a valid invite-qualifying claim in', async () => {
		mockAchievementFindFirstOrThrow.mockResolvedValue({
			...ACHIEVEMENT,
			json: { capabilities: { inviteRequires: 'ach-qual' } }
		});
		mockClaimFindFirst.mockResolvedValue({ id: 'claim-q', validFrom: new Date() });
		const result = (await load(makeEvent({ id: 'u1', orgRole: null }))) as {
			achievement: { id: string };
		};
		expect(result.achievement.id).toBe('ach-1');
	});

	it('returns the achievement to an admin, without any achievementConfig include', async () => {
		const result = (await load(makeEvent({ id: 'admin-1', orgRole: 'GENERAL_ADMIN' }))) as {
			achievement: { id: string };
		};
		expect(result.achievement.id).toBe('ach-1');

		const query = mockAchievementFindFirstOrThrow.mock.calls[0][0];
		expect(query.where).toEqual({ id: 'ach-1', organizationId: 'org-1' });
		expect(Object.keys(query.include)).toEqual(['_count']);
		expect(result.achievement).not.toHaveProperty('achievementConfig');
	});
});
