import { json } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import type { RequestEvent } from './$types';
import { calculatePageAndSize } from '$lib/utils/pagination';

export const GET = async ({ url, params, locals }: RequestEvent) => {
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
