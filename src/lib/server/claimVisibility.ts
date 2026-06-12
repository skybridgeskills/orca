import type { AchievementClaim, Prisma, Visibility } from '@prisma/client';

import type { ViewerRole } from '$lib/claimViewModel';

// Re-export so existing server-side consumers can keep importing the type from
// here. The canonical declaration lives in the client-safe `$lib/claimViewModel`
// module so the browser bundle can share it (see P3).
export type { ViewerRole };

// Admins per existing convention (lib/permissions/isAdmin.ts):
//   GENERAL_ADMIN, CONTENT_ADMIN. BILLING_ADMIN is NOT an admin here.
const ADMIN_ROLES = ['GENERAL_ADMIN', 'CONTENT_ADMIN'];

// Visibilities a non-owner community member may see. ACHIEVEMENT is treated as
// COMMUNITY for now (D2: deferred), so community members can see it.
const COMMUNITY_VISIBLE: Visibility[] = ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT'];

/**
 * Resolve the viewer's role relative to a single claim.
 * Precedence: owner > admin > community (any other authed org user) > public.
 */
export function viewerRole(
	claim: Pick<AchievementClaim, 'userId'>,
	session: App.SessionData | null | undefined
): ViewerRole {
	const user = session?.user;
	if (!user?.id) return 'public';
	if (user.id === claim.userId) return 'owner';
	if (ADMIN_ROLES.includes(user.orgRole || 'none')) return 'admin';
	return 'community';
}

/**
 * Predicate for a single, already-loaded claim. Org-scoping is the caller's
 * responsibility; this only adds the visibility dimension.
 */
export function canViewClaim(
	claim: Pick<AchievementClaim, 'userId' | 'visibility'>,
	session: App.SessionData | null | undefined
): boolean {
	switch (viewerRole(claim, session)) {
		case 'owner':
		case 'admin':
			return true;
		case 'community':
			return COMMUNITY_VISIBLE.includes(claim.visibility);
		case 'public':
			return claim.visibility === 'PUBLIC';
	}
}

/**
 * Prisma `where` fragment to filter a claim list to what `session` may see.
 * Meant to be ANDed with the caller's own filters (organizationId,
 * achievementId, claimStatus, …); this helper only adds the visibility
 * dimension and never replaces org-scoping.
 *
 * For the community case we OR-in the viewer's own claims so a member never
 * loses sight of their own PRIVATE claims in a shared list.
 */
export function claimVisibilityWhere(
	session: App.SessionData | null | undefined
): Prisma.AchievementClaimWhereInput {
	const user = session?.user;

	// public: no session → PUBLIC only.
	if (!user?.id) return { visibility: 'PUBLIC' };

	// admin: any visibility (no restriction).
	if (ADMIN_ROLES.includes(user.orgRole || 'none')) return {};

	// owner-or-community: see community-visible claims plus all of one's own.
	return {
		OR: [{ userId: user.id }, { visibility: { in: COMMUNITY_VISIBLE } }]
	};
}
