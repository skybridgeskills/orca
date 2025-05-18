import { error, json } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import type { RequestHandler } from './$types';
import { calculatePageAndSize } from '$lib/utils/pagination';
import { apiResponse } from '$lib/utils/api';

export const GET: RequestHandler = async ({ url, request, params, locals }) => {
	if (!locals.session?.user) throw error(401);
	if (prefersHtml(request)) throw redirect(302, '/backpack');

	const { page, pageSize, includeCount } = calculatePageAndSize(url);
	const achievements = await prisma.achievementClaim.findMany({
		where: {
			organizationId: locals.org.id,
			userId: locals.session.user.id
		},
		skip: (page - 1) * pageSize,
		take: pageSize
		// orderBy: { identifier: 'desc' },
	});

	return await apiResponse({
		params,
		data: achievements,
		meta: {
			type: 'Achievement',
			getTotalCount: () =>
				prisma.achievementClaim.count({
					where: { organizationId: locals.org.id, userId: locals.session?.user?.id }
				}),
			page,
			pageSize,
			includeCount
		}
	});
};
