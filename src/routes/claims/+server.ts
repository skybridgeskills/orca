import { json } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import type { RequestEvent } from './$types';
import { calculatePageAndSize } from '$lib/utils/pagination';

export const GET = async ({ url, params, locals }: RequestEvent) => {
	const { page, pageSize } = calculatePageAndSize(url);

	const achievementId = url.searchParams.get('achievementId');

	// don't return claims if not logged in or no achievementId
	if (!locals.session || !achievementId) {
		return json({
			claims: [],
			page,
			pageSize,
			total: 0
		});
	}

	const editAchievementCapability = locals.session?.user?.orgRole == 'GENERAL_ADMIN';

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

	const total = await prisma.achievementClaim.count({
		where: {
			achievementId: achievementId,
			organizationId: locals.org.id,
			// Only admins can see rejected claims, other members can only see accepted
			claimStatus: editAchievementCapability
				? { in: ['ACCEPTED', 'UNACCEPTED', 'REJECTED'] }
				: { in: ['ACCEPTED', 'UNACCEPTED'] }
		}
	});

	return json({
		claims,
		page,
		pageSize,
		total
	});
};
