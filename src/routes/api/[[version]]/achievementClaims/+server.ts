import { error } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { resolveApiAuth } from '$lib/server/oauth/apiAuth';
import { SCOPE_ACHIEVEMENTCLAIM_READONLY } from '$lib/server/oauth/scopes';
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

	const editAchievementCapability = ['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(
		locals.session?.user?.orgRole || 'none'
	);
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
