import * as m from '$lib/i18n/messages';
import { error, json } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import type { RequestHandler } from './$types';
import { calculatePageAndSize } from '$lib/utils/pagination';
import { apiResponse } from '$lib/utils/api';

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
