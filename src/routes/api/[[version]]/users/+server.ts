import { error, redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { isAdmin } from '$lib/permissions/isAdmin';
import {
	toUserSummary,
	userDirectoryWhere,
	userSearchWhere,
	userSummarySelect
} from '$lib/server/userDirectory';
import { apiResponse } from '$lib/utils/api';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import { calculatePageAndSize } from '$lib/utils/pagination';

import type { RequestHandler } from './$types';

/**
 * Search the org's users under the /members directory rules. Session only: no app-token
 * scope covers users yet. Emails are returned, and matched, for admins only.
 */
export const GET: RequestHandler = async ({ url, request, params, locals }) => {
	if (prefersHtml(request)) redirect(302, '/members');

	const viewer = locals.session?.user;
	if (!viewer) error(401, 'Unauthorized');

	const directoryWhere = await userDirectoryWhere({ viewer, org: locals.org });
	if (!directoryWhere) error(403, 'Forbidden');

	const includeEmail = isAdmin(viewer);
	const { page, pageSize, includeCount } = calculatePageAndSize(url);
	const where = {
		AND: [
			directoryWhere,
			userSearchWhere(url.searchParams.get('q') ?? '', { orgId: locals.org.id, includeEmail })
		]
	};

	const rows = await prisma.user.findMany({
		where,
		select: userSummarySelect({ orgId: locals.org.id, includeEmail }),
		orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }, { id: 'asc' }],
		skip: (page - 1) * pageSize,
		take: pageSize
	});

	return await apiResponse({
		params,
		data: rows.map((r) => toUserSummary(r, { includeEmail })),
		meta: {
			type: 'User',
			page,
			pageSize,
			includeCount,
			getTotalCount: () => prisma.user.count({ where })
		}
	});
};
