import * as m from '$lib/i18n/messages';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';

export const load: PageServerLoad = async ({ locals, params }) => {
	const claim = await prisma.achievementClaim.findUnique({
		where: { id: params.claimId },
		include: {
			endorsements: true,
			achievement: {
				include: {
					achievementConfig: {
						include: { claimRequires: true, reviewRequires: true }
					},
					category: true
				}
			}
		}
	});
	if (!claim || claim?.organizationId != locals.org.id || claim.claimStatus != 'ACCEPTED')
		throw error(404, m.claim_notFoundError());

	return {
		claim
	};
};
