import { json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { calculatePageAndSize } from '$lib/utils/pagination';

import type { RequestEvent } from './$types';

export const GET = async ({ url, locals }: RequestEvent) => {
	const { page, pageSize } = calculatePageAndSize(url);

	const claimId = url.searchParams.get('claimId');

	// don't return endorsements if not logged in or no claimId
	if (!locals.session || !claimId) {
		return json({
			endorsements: [],
			page,
			pageSize,
			total: 0
		});
	}

	const endorsements = await prisma.claimEndorsement.findMany({
		where: {
			claimId: claimId
		},
		take: pageSize,
		skip: (page - 1) * pageSize,
		include: { creator: true },
		orderBy: { createdAt: 'asc' }
	});

	const total = await prisma.claimEndorsement.count({
		where: {
			claimId: claimId
		}
	});

	return json({
		endorsements,
		page,
		pageSize,
		total
	});
};
