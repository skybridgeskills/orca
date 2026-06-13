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

/**
 * The Prisma `where` fragment for a claim that makes its holder a member of the
 * organization: approved (`validFrom` set), accepted, and not expired. This is the
 * single source of truth for membership-claim validity — P3 (members list) and P4
 * (batched claims query) reuse it rather than re-stating the rule.
 */
export function validMembershipClaimWhere(achievementId: string, orgId: string) {
	return {
		achievementId,
		organizationId: orgId,
		validFrom: { not: null }, // Claim must be approved
		claimStatus: 'ACCEPTED' as const, // Claim must be accepted
		OR: [
			{ validUntil: null }, // No expiration
			{ validUntil: { gt: new Date() } } // Not yet expired
		]
	};
}

interface IsMemberParams {
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
 * Whether a user is a "member" of the org for community-visibility gating.
 * Admins are always members. Otherwise requires a valid claim of the configured
 * membership achievement. NOTE: when no membership achievement is configured this
 * returns `false`; callers decide the "unset = open" behavior (they must treat an
 * unconfigured org as open — see each gated call site in P3/P4).
 * @param params - Object containing user and organization data
 * @returns Promise<boolean> - True if the user is a member
 */
export async function isMember({ user, org }: IsMemberParams): Promise<boolean> {
	// Admins are always members
	if (['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(user.orgRole || 'none')) {
		return true;
	}

	const requiredAchievementId = org.json?.permissions?.membershipAchievement?.requiresAchievement;
	if (!requiredAchievementId) {
		return false;
	}

	const claim = await prisma.achievementClaim.findFirst({
		where: {
			userId: user.id,
			...validMembershipClaimWhere(requiredAchievementId, org.id)
		}
	});

	return !!claim;
}

/** The configured membership achievement id, or null when unset. */
export function membershipAchievementId(org: { json: App.OrganizationConfig }): string | null {
	return org.json?.permissions?.membershipAchievement?.requiresAchievement ?? null;
}

interface CanInviteToAchievementParams {
	user: {
		id: string;
		orgRole: string | null;
	};
	achievement: App.AchievementWithJson | null;
}

/**
 * Check if a user may invite/award this achievement.
 * Mirrors inviteToClaim authorization: admins always; others only when
 * inviteRequires is configured and they hold a qualifying claim.
 */
export async function canInviteToAchievement({
	user,
	achievement
}: CanInviteToAchievementParams): Promise<boolean> {
	if (['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(user.orgRole || 'none')) {
		return true;
	}

	const inviteRequiresId = achievement?.json?.capabilities?.inviteRequires;
	if (!inviteRequiresId) {
		return false;
	}

	const inviteQualificationClaim = await prisma.achievementClaim.findFirst({
		where: {
			achievementId: inviteRequiresId,
			userId: user.id,
			validFrom: { not: null }
		}
	});

	return !!inviteQualificationClaim;
}
