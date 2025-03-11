import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import type { RequestEvent } from './$types';
import { apiResponse } from '$lib/utils/api';
import { calculatePageAndSize } from '$lib/utils/pagination';

export const GET = async ({ url, params, locals }: RequestEvent) => {
	if (!locals.session) {
		throw error(401, 'Unauthorized');
	}

	const achievementId = url.searchParams.get('achievementId');
	if (!achievementId) {
		throw error(400, 'Missing achievementId query parameter');
	}

	const editAchievementCapability = locals.session?.user?.orgRole == 'GENERAL_ADMIN';
	const { page, pageSize, includeCount } = calculatePageAndSize(url);
	const claims = await prisma.achievementClaim.findMany({
		where: {
			achievementId: achievementId,
			organizationId: locals.org.id,
			// Only admins can see rejected claims, other members can only see accepted
			claimStatus: editAchievementCapability
				? { in: ['ACCEPTED', 'UNACCEPTED', 'REJECTED'] }
				: { in: ['ACCEPTED', 'UNACCEPTED'] }
		},
		take: pageSize,
		skip: (page - 1) * pageSize,
		include: {
			user: true,
			_count: {
				select: {
					endorsements: true
				}
			}
		},
		orderBy: { createdOn: 'asc' }
	});

	return apiResponse({
		params,
		data: claims,
		meta: {
			type: 'AchievementClaim',
			includeCount,
			getTotalCount: async () => {
				return await prisma.achievementClaim.count({
					where: {
						achievementId: achievementId,
						organizationId: locals.org.id,
						// Only admins can see rejected claims, other members can only see accepted
						claimStatus: editAchievementCapability
							? { in: ['ACCEPTED', 'UNACCEPTED', 'REJECTED'] }
							: { in: ['ACCEPTED', 'UNACCEPTED'] }
					}
				});
			},
			page,
			pageSize
		}
	});
};
