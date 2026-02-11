import * as m from '$lib/i18n/messages';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';

import { getAchievement } from '$lib/data/achievement';
import { getUserClaim } from '$lib/data/achievementClaim';

const throwRedirect = (url: URL) => {
	throw redirect(307, `${url}/public`);
};

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.session?.user) return throwRedirect(url);

	const claim = await prisma.achievementClaim.findUnique({
		where: { id: params.claimId },
		include: { user: true }
	});

	if (!claim || claim.organizationId != locals.org.id) throw error(404, m.best_sharp_lamb_enchant());

	const achievement = await getAchievement(claim.achievementId, locals.org.id);
	const config = achievement.achievementConfig;

	const hasProvidedEndorsement = !!(await prisma.claimEndorsement.findFirst({
		where: {
			claimId: params.claimId,
			creatorId: locals.session.user.id
		}
	}));

	// If the user has been directly invited to claim the badge, let them proceed
	const endorsementCount = await prisma.claimEndorsement.count({
		where: {
			claimId: params.claimId
		}
	});

	// If this badge requires a member to hold another badge, get the relevant claim for that badge.
	// If they have it, they are eligible to claim this badge. Only bother to do this if they don't already
	// have a claim.
	const prerequisiteClaim =
		!claim && config?.claimable && config?.claimRequiresId && locals.session?.user.id
			? await getUserClaim(locals.session?.user.id, config?.claimRequiresId, locals.org.id)
			: null;

	return {
		organization: locals.org,
		claim,
		achievement,
		hasProvidedEndorsement,
		endorsementCount,
		user: locals.session?.user,
		prerequisiteClaim
	};
};
