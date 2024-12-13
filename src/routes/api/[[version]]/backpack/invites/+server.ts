import { error, json } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import type { RequestHandler } from './$types';
import { calculatePageAndSize } from '$lib/utils/pagination';
import { apiResponse } from '$lib/utils/api';

export const GET: RequestHandler = async ({ url, request, params, locals }) => {
	if (!locals.session?.user) error(401);
	if (prefersHtml(request)) redirect(302, '/backpack');

	const { includeCount } = calculatePageAndSize(url);
	const outstandingInvites = await prisma.claimEndorsement.findMany({
		where: {
			inviteeEmail: {
				in: locals.session.user.identifiers
					.filter((i) => i.type == 'EMAIL')
					.map((i) => i.identifier)
			},
			organizationId: locals.org.id,
			claimId: null
		},
		distinct: ['achievementId']
	});

	return await apiResponse({
		params,
		data: outstandingInvites,
		meta: {
			type: 'ClaimEndorsement',
			getTotalCount: async () => outstandingInvites.length,
			page: 1,
			pageSize: outstandingInvites.length,
			includeCount
		}
	});
};
