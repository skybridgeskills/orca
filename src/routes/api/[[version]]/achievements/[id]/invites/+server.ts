import { error } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { isAdmin } from '$lib/permissions/isAdmin';
import { apiResponse } from '$lib/utils/api';
import { calculatePageAndSize } from '$lib/utils/pagination';

import type { RequestEvent } from './$types';

export const GET = async ({ url, params, locals }: RequestEvent) => {
	if (!locals.session?.user) {
		error(401, 'Unauthorized');
	}

	const achievementId = params.id;
	const viewerIsAdmin = isAdmin(locals.session.user);
	const { page, pageSize, includeCount } = calculatePageAndSize(url);

	const invites = await prisma.claimEndorsement.findMany({
		where: {
			achievementId: achievementId,
			organizationId: locals.org.id,
			claimId: null,
			// Admins may view all invites, other users may only view their own.
			...(viewerIsAdmin ? {} : { creatorId: locals.session.user.id })
		},
		include: {
			creator: true
		},
		take: pageSize,
		skip: (page - 1) * pageSize,
		orderBy: { createdAt: 'asc' }
	});

	return apiResponse({
		params,
		data: invites,
		meta: {
			type: 'ClaimEndorsement',
			includeCount,
			getTotalCount: async () => {
				return await prisma.claimEndorsement.count({
					where: {
						achievementId: achievementId,
						organizationId: locals.org.id,
						claimId: null,
						...(viewerIsAdmin ? {} : { creatorId: locals.session?.user?.id })
					}
				});
			},
			page,
			pageSize
		}
	});
};
