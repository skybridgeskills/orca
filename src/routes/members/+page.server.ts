import type { Prisma, User } from '@prisma/client';
import { redirect } from '@sveltejs/kit';

import { isAdmin } from '$lib/permissions/isAdmin';
import { COMMUNITY_VISIBLE } from '$lib/server/claimVisibility';
import {
	isMember,
	membershipAchievementId,
	validMembershipClaimWhere
} from '$lib/server/permissions';
import { calculatePageAndSize } from '$lib/utils/pagination';

import { prisma } from '../../prisma/client';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	// redirect user if logged out
	if (!locals.session?.user) redirect(302, `/`);

	const viewer = locals.session.user;
	const { page, pageSize } = calculatePageAndSize(url);

	const membershipId = membershipAchievementId(locals.org);
	const gatingActive = membershipId !== null;
	const viewerIsAdmin = isAdmin(viewer);

	// When gated, a non-member (non-admin) viewer may not see the directory at all.
	if (gatingActive && !(await isMember({ user: viewer, org: locals.org }))) {
		redirect(302, `/`);
	}

	// The list `where`, identical for findMany + count so the pagination header
	// matches the visible rows. Org-scoped in every branch.
	let where: Prisma.UserWhereInput = { organizationId: locals.org.id };
	if (gatingActive && !viewerIsAdmin) {
		// Member (non-admin) viewer: only visible members, plus self (never hide self).
		where = {
			organizationId: locals.org.id,
			receivedAchievementClaims: { some: validMembershipClaimWhere(membershipId, locals.org.id) },
			OR: [{ id: viewer.id }, { profileVisibility: { in: COMMUNITY_VISIBLE } }]
		};
	}

	const users = await prisma.user.findMany({
		where,
		skip: (page - 1) * pageSize,
		take: pageSize,
		orderBy: [
			{
				orgRole: 'asc'
			},
			{
				familyName: 'asc'
			}
		]
	});

	const count = await prisma.user.count({ where });

	// Attach a per-row `linkable` boolean so the svelte never re-derives membership.
	let members: (User & { linkable: boolean })[];
	if (!gatingActive) {
		// Open: every row links to its profile, as today.
		members = users.map((u) => ({ ...u, linkable: true }));
	} else if (viewerIsAdmin) {
		// Admin viewer sees all org users (members + non-members). Determine which of
		// the page's rows are members via ONE batched membership-claim query, then a
		// row is linkable when it is a member AND (visible OR self).
		const memberClaims = await prisma.achievementClaim.findMany({
			where: {
				userId: { in: users.map((u) => u.id) },
				...validMembershipClaimWhere(membershipId, locals.org.id)
			},
			select: { userId: true }
		});
		const isMemberSet = new Set(memberClaims.map((c) => c.userId));
		members = users.map((u) => ({
			...u,
			linkable:
				isMemberSet.has(u.id) &&
				(COMMUNITY_VISIBLE.includes(u.profileVisibility) || u.id === viewer.id)
		}));
	} else {
		// Member (non-admin) viewer: the list is already filtered to linkable rows.
		members = users.map((u) => ({ ...u, linkable: true }));
	}

	return {
		members,
		count
	};
};
