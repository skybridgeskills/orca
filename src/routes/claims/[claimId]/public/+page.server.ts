import { error } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { isSuspended } from '$lib/server/moderation/suspension';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const claim = await prisma.achievementClaim.findUnique({
		where: { id: params.claimId },
		include: {
			endorsements: true,
			achievement: {
				include: {
					claimRequires: true,
					reviewRequires: true,
					category: true
				}
			}
		}
	});
	if (!claim || claim?.organizationId != locals.org.id || claim.claimStatus != 'ACCEPTED')
		error(404, m.best_sharp_lamb_enchant());
	// Public/unauthenticated surface: only PUBLIC claims are served. 404 (not 403)
	// avoids confirming a non-public claim exists.
	if (claim.visibility !== 'PUBLIC') error(404, m.best_sharp_lamb_enchant());

	// P5 moderation: the public surface never serves suspended content. 404 (not 403)
	// avoids confirming existence. Also hide a claim whose underlying achievement is
	// suspended — a suspended badge must not remain publicly displayable.
	if (
		(await isSuspended({ originOrgId: locals.org.id, targetType: 'CLAIM', targetId: claim.id })) ||
		(await isSuspended({
			originOrgId: locals.org.id,
			targetType: 'ACHIEVEMENT',
			targetId: claim.achievementId
		}))
	) {
		error(404, m.best_sharp_lamb_enchant());
	}

	return {
		claim
	};
};
