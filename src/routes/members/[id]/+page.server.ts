import type { Prisma } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';

import * as m from '$lib/i18n/messages';
import { claimVisibilityWhere } from '$lib/server/claimVisibility';
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

	return {
		member
	};
};
