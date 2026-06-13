import type { Prisma } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';

import * as m from '$lib/i18n/messages';
import { isAdmin } from '$lib/permissions/isAdmin';
import { claimVisibilityWhere, COMMUNITY_VISIBLE } from '$lib/server/claimVisibility';
import { isMember, membershipAchievementId } from '$lib/server/permissions';
import { calculatePageAndSize } from '$lib/utils/pagination';

import { prisma } from '../../../prisma/client';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals, params }) => {
	// redirect user if logged out
	if (!locals.session?.user) redirect(302, `/`);

	const { page, pageSize } = calculatePageAndSize(url);

	// Visibility filter ANDed into both the list and its count so the header
	// number matches the visible rows. Org-scoping is preserved below.
	const visibleClaimsWhere = {
		claimStatus: {
			in: ['ACCEPTED', 'UNACCEPTED']
		},
		...claimVisibilityWhere(locals.session)
	} satisfies Prisma.AchievementClaimWhereInput;

	const member = await prisma.user.findUniqueOrThrow({
		where: {
			id: params.id
		},
		include: {
			identifiers: true,
			receivedAchievementClaims: {
				where: visibleClaimsWhere,
				include: { achievement: true },
				skip: (page - 1) * pageSize,
				take: pageSize,
				orderBy: { createdOn: 'desc' }
			},
			_count: {
				select: { receivedAchievementClaims: { where: visibleClaimsWhere } }
			}
		}
	});
	if (member.organizationId != locals.org.id) error(404, m.slow_clear_cheetah_spill());

	// Gate profile access by membership + profileVisibility when gating is active.
	// When unset, behavior is unchanged (any logged-in same-org user). Not-found /
	// cross-org keep the 404 above; gated-out viewers are redirected to /members.
	const viewer = locals.session.user;
	if (
		membershipAchievementId(locals.org) !== null &&
		!isAdmin({ user: viewer }) &&
		params.id !== viewer.id
	) {
		// Non-admin, non-self viewer under gating: allow only when both viewer and
		// target are members and the target's profile is community-visible. Short-circuit
		// on viewer membership and target visibility to keep this to O(1) queries.
		const visibleMember =
			COMMUNITY_VISIBLE.includes(member.profileVisibility) &&
			(await isMember({ user: viewer, org: locals.org })) &&
			(await isMember({ user: { id: member.id, orgRole: member.orgRole }, org: locals.org }));
		if (!visibleMember) redirect(302, `/members`);
	}

	return {
		member
	};
};
