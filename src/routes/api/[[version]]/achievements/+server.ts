import { redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { isAdmin } from '$lib/permissions/isAdmin';
import { annotateSuspensions } from '$lib/server/moderation/suspension';
import { apiResponse } from '$lib/utils/api';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import { calculatePageAndSize } from '$lib/utils/pagination';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, params, locals }) => {
	if (prefersHtml(request)) redirect(302, '/achievements');

	const { page, pageSize, includeCount } = calculatePageAndSize(url);
	// Flattened shape: config fields are now columns/json on the achievement, so the
	// default select returns them. No `achievementConfig` include (the table is gone).
	const achievements = await prisma.achievement.findMany({
		where: {
			organizationId: locals.org.id
		},
		skip: (page - 1) * pageSize,
		take: pageSize,
		orderBy: { identifier: 'desc' }
	});

	// P5 moderation: one batched suspension query for the page (no N+1). Non-admins
	// never receive suspended achievements; admins get every row with a `suspended`
	// flag so the list UI can mark them.
	const viewerIsAdmin = isAdmin({ user: locals.session?.user ?? undefined });
	const annotated = await annotateSuspensions(locals.org.id, achievements, (a) => ({
		targetType: 'ACHIEVEMENT',
		targetId: a.id
	}));
	const data = annotated
		.filter((row) => viewerIsAdmin || !row.suspended)
		.map((row) => ({ ...row.item, suspended: row.suspended }));

	return await apiResponse({
		params,
		data,
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
