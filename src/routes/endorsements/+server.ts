import { json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { resultsFromEndorsementJson, reviewIsCurrent } from '$lib/data/resultDescription';
import { calculatePageAndSize } from '$lib/utils/pagination';

import type { RequestEvent } from './$types';

export const GET = async ({ url, locals }: RequestEvent) => {
	const { page, pageSize } = calculatePageAndSize(url);

	const claimId = url.searchParams.get('claimId');

	const empty = json({ endorsements: [], page, pageSize, total: 0 });

	// don't return endorsements if not logged in or no claimId
	if (!locals.session || !claimId) return empty;

	// Org-scope via the claim, and load the achievement json to compute review currency.
	const claim = await prisma.achievementClaim.findUnique({
		where: { id: claimId },
		include: { achievement: true }
	});
	if (!claim || claim.organizationId !== locals.org.id) return empty;

	const endorsements = await prisma.claimEndorsement.findMany({
		where: {
			claimId: claimId
		},
		take: pageSize,
		skip: (page - 1) * pageSize,
		include: { creator: true },
		orderBy: { createdAt: 'asc' }
	});

	// Attach parsed self-describing results + a server-computed `current` flag (a review
	// is stale if any result references an RD no longer in the current rubric).
	const enriched = endorsements.map((endorsement) => {
		const results = resultsFromEndorsementJson(endorsement.json);
		return { ...endorsement, results, current: reviewIsCurrent(results, claim.achievement.json) };
	});

	const total = await prisma.claimEndorsement.count({
		where: {
			claimId: claimId
		}
	});

	return json({
		endorsements: enriched,
		page,
		pageSize,
		total
	});
};
