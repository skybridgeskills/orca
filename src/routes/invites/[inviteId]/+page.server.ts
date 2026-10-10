import * as m from '$lib/i18n/messages';
import { getAchievement } from '$lib/data/achievement';
import { prisma } from '$lib/../prisma/client';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.session?.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	const invite = await prisma.claimEndorsement.findUnique({
		where: { id: params.inviteId },
		include: { creator: true }
	});

	if (!invite || invite.organizationId !== locals.org.id) {
		throw error(404, m.lucky_alert_penguin_fry());
	}

	if (invite.claimId) {
		throw redirect(303, `/claims/${invite.claimId}`);
	}

	const isAdmin = ['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(
		locals.session.user.orgRole || 'none'
	);
	const canView = isAdmin || invite.creatorId === locals.session.user.id;

	if (!canView) {
		throw error(403, m.red_teary_eagle_drip());
	}

	const achievement = await getAchievement(invite.achievementId, locals.org.id);

	return {
		invite,
		achievement,
		organization: locals.org,
		canDelete: canView
	};
};
