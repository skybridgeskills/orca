import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import type { RequestEvent } from './$types';
import { apiResponse } from '$lib/utils/api';
import { calculatePageAndSize } from '$lib/utils/pagination';

export const GET = async ({ url, params, locals }: RequestEvent) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	const achievementId = params.id;
	const isAdmin = ['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(
		locals.session?.user?.orgRole || 'none'
	);
	const { page, pageSize, includeCount } = calculatePageAndSize(url);

	const invites = await prisma.claimEndorsement.findMany({
		where: {
			achievementId: achievementId,
			organizationId: locals.org.id,
			claimId: null,
			// Admins may view all invites, other users may only view their own.
			...(isAdmin ? {} : { creatorId: locals.session.user.id })
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
						...(isAdmin ? {} : { creatorId: locals.session?.user?.id })
					}
				});
			},
			page,
			pageSize
		}
	});
};
