import { json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { resultsFromEndorsementJson, reviewIsCurrent } from '$lib/data/resultDescription';
import { isAdmin } from '$lib/permissions/isAdmin';
import { annotateSuspensions } from '$lib/server/moderation/suspension';
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

	// P5 moderation: one batched suspension query for the page (no N+1). Suspended
	// endorsements are hidden from non-admins and flagged for admins.
	const viewerIsAdmin = isAdmin(locals.session?.user);
	const annotated = await annotateSuspensions(locals.org.id, endorsements, (e) => ({
		targetType: 'ENDORSEMENT',
		targetId: e.id
	}));
	const visible = annotated.filter((row) => viewerIsAdmin || !row.suspended);

	// Attach parsed self-describing results + a server-computed `current` flag (a review
	// is stale if any result references an RD no longer in the current rubric).
	const enriched = visible.map(({ item: endorsement, suspended }) => {
		const results = resultsFromEndorsementJson(endorsement.json);
		return {
			...endorsement,
			results,
			current: reviewIsCurrent(results, claim.achievement.json),
			suspended
		};
	});

	// Count is best-effort: for admins it is the true total; for non-admins suspended
	// rows are dropped post-query (a pagination corner — see P5 deferrals).
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
