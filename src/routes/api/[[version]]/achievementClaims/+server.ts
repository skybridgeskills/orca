import type { Prisma } from '@prisma/client';
import { error } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { claimVisibilityWhere, COMMUNITY_VISIBLE } from '$lib/server/claimVisibility';
import { resolveApiAuth } from '$lib/server/oauth/apiAuth';
import { SCOPE_ACHIEVEMENTCLAIM_READONLY } from '$lib/server/oauth/scopes';
import {
	isMember,
	membershipAchievementId,
	validMembershipClaimWhere
} from '$lib/server/permissions';
import { apiResponse } from '$lib/utils/api';
import { calculatePageAndSize } from '$lib/utils/pagination';

import type { RequestEvent } from './$types';

export const GET = async ({ request, url, params, locals }: RequestEvent) => {
	// Accept either an ORCA session (unchanged behaviour) or a client_credentials
	// Bearer token carrying AchievementClaim.readonly. Org-scoped in both cases.
	const auth = await resolveApiAuth({ request, locals }, [SCOPE_ACHIEVEMENTCLAIM_READONLY]);
	if ('error' in auth) {
		if (auth.error === 'insufficient_scope') error(403, 'insufficient_scope');
		error(401, 'Unauthorized');
	}

	const achievementId = url.searchParams.get('achievementId');
	if (!achievementId) {
		error(400, 'Missing achievementId query parameter');
	}

	const viewerIsAdmin = ['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(
		locals.session?.user?.orgRole || 'none'
	);
	const editAchievementCapability = viewerIsAdmin;

	// P4: when a membership achievement is configured, the claims/earners list is
	// members-only (admins always count as members). Defense-in-depth alongside the
	// page-level gate: a gated non-member gets a 403 and no rows. When unset, the
	// endpoint behaves exactly as before.
	const membershipId = membershipAchievementId(locals.org);
	const gatingActive = membershipId !== null;
	if (gatingActive) {
		const callerIsMember =
			!!locals.session?.user &&
			(await isMember({
				user: {
					id: locals.session.user.id,
					orgRole: locals.session.user.orgRole
				},
				org: { id: locals.org.id, json: locals.org.json }
			}));
		if (!callerIsMember) error(403, 'Forbidden');
	}

	const { page, pageSize, includeCount } = calculatePageAndSize(url);
	// Visibility filter ANDed with the existing org/status scoping. Admins get an
	// empty fragment (no restriction); community viewers never receive others'
	// PRIVATE rows. `visibility` is a scalar column and is returned by default
	// (no `select` strips it).
	const claimsWhere = {
		achievementId: achievementId,
		organizationId: locals.org.id,
		// Only admins can see rejected claims, other members can only see accepted
		claimStatus: editAchievementCapability
			? { in: ['ACCEPTED', 'UNACCEPTED', 'REJECTED'] }
			: { in: ['ACCEPTED', 'UNACCEPTED'] },
		...claimVisibilityWhere(locals.session)
	} satisfies Prisma.AchievementClaimWhereInput;

	const claims = await prisma.achievementClaim.findMany({
		where: claimsWhere,
		take: pageSize,
		skip: (page - 1) * pageSize,
		include: {
			// `user` is returned in full (the list UI uses given/family name); the
			// default scalar select already carries `id` and `profileVisibility`,
			// which the per-row `profileLinkable` computation below relies on.
			user: true,
			_count: {
				select: {
					endorsements: true
				}
			}
		},
		orderBy: { createdOn: 'asc' }
	});

	// P4: per-row `profileLinkable` — whether this viewer may follow the claimant's
	// name to their member profile. Computed with ONE extra indexed `IN` query for
	// the whole page (no per-row DB calls):
	//   - admins: every claimant is linkable;
	//   - your own row: always linkable;
	//   - otherwise: the claimant must be a member AND have a community-visible
	//     profileVisibility.
	// When gating is unset, everyone is treated as a member (links stay open).
	const userIds = [...new Set(claims.map((c) => c.userId))];
	let memberIds: Set<string>;
	if (gatingActive && userIds.length) {
		const memberRows = await prisma.achievementClaim.findMany({
			where: {
				userId: { in: userIds },
				...validMembershipClaimWhere(membershipId!, locals.org.id)
			},
			select: { userId: true }
		});
		memberIds = new Set(memberRows.map((r) => r.userId));
	} else {
		memberIds = new Set(userIds);
	}

	const sessionUserId = locals.session?.user?.id;
	const data = claims.map((claim) => ({
		...claim,
		profileLinkable:
			viewerIsAdmin ||
			claim.userId === sessionUserId ||
			(memberIds.has(claim.userId) && COMMUNITY_VISIBLE.includes(claim.user.profileVisibility))
	}));

	return apiResponse({
		params,
		data,
		meta: {
			type: 'AchievementClaim',
			includeCount,
			getTotalCount: async () => {
				return await prisma.achievementClaim.count({
					where: claimsWhere
				});
			},
			page,
			pageSize
		}
	});
};
