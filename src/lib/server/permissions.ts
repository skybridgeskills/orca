import { prisma } from '$lib/../prisma/client';

interface CanEditAchievementsParams {
	user: {
		id: string;
		orgRole: string | null;
	};
	org: {
		id: string;
		json: App.OrganizationConfig;
	};
}

/**
 * Check if a user can edit achievements based on their role and organization configuration
 * @param params - Object containing user and organization data
 * @returns Promise<boolean> - True if user can edit achievements
 */
export async function canEditAchievements({
	user,
	org
}: CanEditAchievementsParams): Promise<boolean> {
	// Admins always have permission
	if (['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(user.orgRole || 'none')) {
		return true;
	}

	// Check if organization has configured a required achievement
	const requiredAchievementId =
		org.json?.permissions?.editAchievementCapability?.requiresAchievement;
	if (!requiredAchievementId) {
		return false;
	}

	// Verify the required achievement exists in this organization
	const achievement = await prisma.achievement.findFirst({
		where: {
			id: requiredAchievementId,
			organizationId: org.id
		}
	});

	if (!achievement) {
		console.warn(
			`Organization ${org.id} references non-existent achievement ${requiredAchievementId} in editAchievementCapability permissions`
		);
		return false;
	}

	// Check if user has a valid claim for the required achievement
	const userClaim = await prisma.achievementClaim.findFirst({
		where: {
			userId: user.id,
			achievementId: requiredAchievementId,
			organizationId: org.id,
			validFrom: { not: null }, // Claim must be approved
			claimStatus: 'ACCEPTED', // Claim must be accepted
			OR: [
				{ validUntil: null }, // No expiration
				{ validUntil: { gt: new Date() } } // Not yet expired
			]
		}
	});

	return !!userClaim;
}
