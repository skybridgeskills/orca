import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '$lib/../prisma/client';

import {
	canInviteToAchievement,
	isMember,
	membershipAchievementId,
	validMembershipClaimWhere
} from './permissions';

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievementClaim: {
			findFirst: vi.fn()
		}
	}
}));

const achievementWithInvite = (inviteRequires: string | null): App.AchievementWithJson =>
	({
		json: { capabilities: { inviteRequires }, claimTemplate: '' }
	}) as unknown as App.AchievementWithJson;

describe('canInviteToAchievement', () => {
	beforeEach(() => {
		vi.mocked(prisma.achievementClaim.findFirst).mockReset();
	});

	it('returns true for GENERAL_ADMIN without querying claims', async () => {
		const result = await canInviteToAchievement({
			user: { id: 'user-1', orgRole: 'GENERAL_ADMIN' },
			achievement: achievementWithInvite(null)
		});

		expect(result).toBe(true);
		expect(prisma.achievementClaim.findFirst).not.toHaveBeenCalled();
	});

	it('returns false for non-admin when achievement has no inviteRequires', async () => {
		const result = await canInviteToAchievement({
			user: { id: 'user-1', orgRole: null },
			achievement: achievementWithInvite(null)
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
			achievement: achievementWithInvite('badge-1')
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
			achievement: achievementWithInvite('badge-1')
		});

		expect(result).toBe(false);
	});
});

const ORG_OPEN = { id: 'org-1', json: {} as App.OrganizationConfig };
const ORG_GATED = {
	id: 'org-1',
	json: {
		permissions: { membershipAchievement: { requiresAchievement: 'ach-member' } }
	} as App.OrganizationConfig
};

describe('isMember', () => {
	beforeEach(() => {
		vi.mocked(prisma.achievementClaim.findFirst).mockReset();
	});

	it('returns true for admins regardless of config (no claim lookup)', async () => {
		for (const orgRole of ['GENERAL_ADMIN', 'CONTENT_ADMIN']) {
			expect(await isMember({ user: { id: 'admin-1', orgRole }, org: ORG_OPEN })).toBe(true);
		}
		// Admins short-circuit before touching prisma even when gating is configured.
		expect(
			await isMember({ user: { id: 'admin-1', orgRole: 'GENERAL_ADMIN' }, org: ORG_GATED })
		).toBe(true);
		expect(prisma.achievementClaim.findFirst).not.toHaveBeenCalled();
	});

	it('returns false for a non-admin when no membership achievement is configured', async () => {
		expect(await isMember({ user: { id: 'user-1', orgRole: 'MEMBER' }, org: ORG_OPEN })).toBe(
			false
		);
		expect(prisma.achievementClaim.findFirst).not.toHaveBeenCalled();
	});

	it('returns true when configured and the user holds a valid claim', async () => {
		vi.mocked(prisma.achievementClaim.findFirst).mockResolvedValue({ id: 'claim-1' } as never);
		expect(await isMember({ user: { id: 'user-1', orgRole: 'MEMBER' }, org: ORG_GATED })).toBe(
			true
		);
		expect(prisma.achievementClaim.findFirst).toHaveBeenCalledWith({
			where: expect.objectContaining({
				userId: 'user-1',
				achievementId: 'ach-member',
				organizationId: 'org-1',
				validFrom: { not: null },
				claimStatus: 'ACCEPTED'
			})
		});
	});

	it('returns false when configured but no matching valid claim (expired / REJECTED / validFrom null)', async () => {
		// The validity `where` (validFrom set, ACCEPTED, not expired) filters these out,
		// so findFirst yields null for an expired, rejected, or unapproved claim.
		vi.mocked(prisma.achievementClaim.findFirst).mockResolvedValue(null);
		expect(await isMember({ user: { id: 'user-1', orgRole: 'MEMBER' }, org: ORG_GATED })).toBe(
			false
		);
	});

	it('treats a null orgRole as a non-admin', async () => {
		vi.mocked(prisma.achievementClaim.findFirst).mockResolvedValue(null);
		expect(await isMember({ user: { id: 'user-1', orgRole: null }, org: ORG_OPEN })).toBe(false);
	});
});

describe('validMembershipClaimWhere', () => {
	it('encodes the approved + accepted + not-expired validity rule', () => {
		const where = validMembershipClaimWhere('ach-x', 'org-x');
		expect(where).toMatchObject({
			achievementId: 'ach-x',
			organizationId: 'org-x',
			validFrom: { not: null },
			claimStatus: 'ACCEPTED'
		});
		expect(where.OR[0]).toEqual({ validUntil: null });
		expect(where.OR[1]).toHaveProperty('validUntil');
	});
});

describe('membershipAchievementId', () => {
	it('returns the configured id, or null when unset', () => {
		expect(membershipAchievementId(ORG_GATED)).toBe('ach-member');
		expect(membershipAchievementId(ORG_OPEN)).toBeNull();
	});
});
