import type { AchievementClaim, Prisma, Visibility } from '@prisma/client';

import type { ViewerRole } from '$lib/claimViewModel';
import { isAdmin } from '$lib/permissions/isAdmin';

// Re-export so existing server-side consumers can keep importing the type from
// here. The canonical declaration lives in the client-safe `$lib/claimViewModel`
// module so the browser bundle can share it (see P3).
export type { ViewerRole };

// Visibilities a non-owner member may see. A "member" follows the membership ADR: an
// admin or a holder of the org's membership achievement, or any signed-in org user when
// none is set. ACHIEVEMENT is treated as COMMUNITY for now (D2: deferred), so members
// can see it. Exported so the membership-gating call sites (members list, profile,
// claims list) share one threshold for "visible to other members".
export const COMMUNITY_VISIBLE: Visibility[] = ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT'];

/**
 * The membership input every visibility decision needs. Callers resolve it with
 * `isMemberOrOpen` (or know it from a membership gate they already passed). Required, so
 * each surface decides explicitly; only consulted for the community role.
 */
export interface ClaimViewerContext {
	viewerIsMember: boolean;
}

/**
 * Resolve the viewer's role relative to a single claim.
 * Precedence: owner > admin > community (any other authed org user) > public.
 * A non-member keeps the community role (the UI still renders the non-owner view);
 * only what they may see narrows, via `ClaimViewerContext`.
 */
export function viewerRole(
	claim: Pick<AchievementClaim, 'userId'>,
	session: App.SessionData | null | undefined
): ViewerRole {
	const user = session?.user;
	if (!user?.id) return 'public';
	if (user.id === claim.userId) return 'owner';
	if (isAdmin(user)) return 'admin';
	return 'community';
}

/**
 * Predicate for a single, already-loaded claim. Org-scoping is the caller's
 * responsibility; this only adds the visibility dimension. A signed-in non-member
 * sees what the public sees (plus their own claims, via the owner branch).
 */
export function canViewClaim(
	claim: Pick<AchievementClaim, 'userId' | 'visibility'>,
	session: App.SessionData | null | undefined,
	{ viewerIsMember }: ClaimViewerContext
): boolean {
	switch (viewerRole(claim, session)) {
		case 'owner':
		case 'admin':
			return true;
		case 'community':
			return viewerIsMember
				? COMMUNITY_VISIBLE.includes(claim.visibility)
				: claim.visibility === 'PUBLIC';
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
 * loses sight of their own PRIVATE claims in a shared list. A non-member sees
 * PUBLIC claims plus their own.
 */
export function claimVisibilityWhere(
	session: App.SessionData | null | undefined,
	{ viewerIsMember }: ClaimViewerContext
): Prisma.AchievementClaimWhereInput {
	const user = session?.user;

	// public: no session → PUBLIC only.
	if (!user?.id) return { visibility: 'PUBLIC' };

	// admin: any visibility (no restriction).
	if (isAdmin(user)) return {};

	// owner-or-community: members see community-visible claims, non-members PUBLIC
	// only; both see all of their own.
	return {
		OR: [
			{ userId: user.id },
			viewerIsMember ? { visibility: { in: COMMUNITY_VISIBLE } } : { visibility: 'PUBLIC' }
		]
	};
}
