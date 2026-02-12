import { prisma } from '$lib/../prisma/client';
import type { AchievementClaim, ClaimEndorsement } from '@prisma/client';

export const getUserClaim = async (
	userId: string,
	achievementId: string,
	organizationId: string
) => {
	return await prisma.achievementClaim.findUnique({
		where: {
			userId_achievementId: {
				userId,
				achievementId
			}
		}
	});
};

/**
 * Get a user's valid claim for an achievement.
 * A claim is considered valid if it:
 * - Has been reviewed/approved (validFrom is set)
 * - Is accepted (claimStatus is 'ACCEPTED')
 * - Has not expired (validUntil is null or in the future)
 * - Belongs to the specified organization
 */
export const getValidUserClaim = async (
	userId: string,
	achievementId: string,
	organizationId: string
) => {
	return await prisma.achievementClaim.findFirst({
		where: {
			userId,
			achievementId,
			organizationId,
			validFrom: { not: null }, // Claim must be approved
			claimStatus: 'ACCEPTED', // Claim must be accepted
			OR: [
				{ validUntil: null }, // No expiration
				{ validUntil: { gt: new Date() } } // Not yet expired
			]
		}
	});
};

interface EvidenceItem {
	narrative?: string;
	id?: string;
}
