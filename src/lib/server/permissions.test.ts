import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '$lib/../prisma/client';

import { canInviteToAchievement } from './permissions';

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievementClaim: {
			findFirst: vi.fn()
		}
	}
}));

const achievementConfig = (inviteRequires: string | null): App.AchievementConfig =>
	({
		json: { capabilities: { inviteRequires }, claimTemplate: '' }
	}) as App.AchievementConfig;

describe('canInviteToAchievement', () => {
	beforeEach(() => {
		vi.mocked(prisma.achievementClaim.findFirst).mockReset();
	});

	it('returns true for GENERAL_ADMIN without querying claims', async () => {
		const result = await canInviteToAchievement({
			user: { id: 'user-1', orgRole: 'GENERAL_ADMIN' },
			achievementConfig: achievementConfig(null)
		});

		expect(result).toBe(true);
		expect(prisma.achievementClaim.findFirst).not.toHaveBeenCalled();
	});

	it('returns false for non-admin when achievement has no inviteRequires', async () => {
		const result = await canInviteToAchievement({
			user: { id: 'user-1', orgRole: null },
			achievementConfig: achievementConfig(null)
		});

		expect(result).toBe(false);
		expect(prisma.achievementClaim.findFirst).not.toHaveBeenCalled();
	});

	it('returns true for qualified non-admin with approved inviteRequires claim', async () => {
		vi.mocked(prisma.achievementClaim.findFirst).mockResolvedValue({
			id: 'claim-1'
		} as never);

		const result = await canInviteToAchievement({
			user: { id: 'user-1', orgRole: null },
			achievementConfig: achievementConfig('badge-1')
		});

		expect(result).toBe(true);
		expect(prisma.achievementClaim.findFirst).toHaveBeenCalledWith({
			where: {
				achievementId: 'badge-1',
				userId: 'user-1',
				validFrom: { not: null }
			}
		});
	});

	it('returns false for non-admin without qualifying claim', async () => {
		vi.mocked(prisma.achievementClaim.findFirst).mockResolvedValue(null);

		const result = await canInviteToAchievement({
			user: { id: 'user-1', orgRole: null },
			achievementConfig: achievementConfig('badge-1')
		});

		expect(result).toBe(false);
	});
});
