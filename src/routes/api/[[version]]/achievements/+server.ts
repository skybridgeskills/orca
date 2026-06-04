import { redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { apiResponse } from '$lib/utils/api';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import { calculatePageAndSize } from '$lib/utils/pagination';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, params, locals }) => {
	if (prefersHtml(request)) redirect(302, '/achievements');

	const { page, pageSize, includeCount } = calculatePageAndSize(url);
	const achievements = await prisma.achievement.findMany({
		where: {
			organizationId: locals.org.id
		},
		skip: (page - 1) * pageSize,
		take: pageSize,
		orderBy: { identifier: 'desc' },
		include: {
			achievementConfig: true
		}
	});

	return await apiResponse({
		params,
		data: achievements,
		meta: {
			type: 'Achievement',
			getTotalCount: () =>
				prisma.achievement.count({
					where: { organizationId: locals.org.id }
				}),
			page,
			pageSize,
			includeCount
		}
	});
};
