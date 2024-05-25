import * as m from '$lib/i18n/messages';
import { error, json } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import type { RequestHandler } from './$types';
import { calculatePageAndSize } from '$lib/utils/pagination';
import { apiResponse } from '$lib/utils/api';

export const GET: RequestHandler = async ({ url, request, params, locals }) => {
	if (prefersHtml(request)) throw redirect(302, '/achievements/categories');

	const { includeCount } = calculatePageAndSize(url);
	const data = await prisma.achievementCategory.findMany({
		where: {
			organizationId: locals.org.id
		},
		include: {
			_count: {
				select: { achievements: true }
			}
		}
	});

	return await apiResponse({
		params,
		data,
		meta: {
			type: 'AchievementCategory',
			getTotalCount: async () => {
				return data.length;
			},
			page: 1,
			pageSize: data.length,
			includeCount
		}
	});
};
