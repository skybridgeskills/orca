import { error } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { isAdmin } from '$lib/permissions/isAdmin';
import { apiResponse } from '$lib/utils/api';

export const DELETE = async ({ params, locals }) => {
	// Authentication check
	if (!locals.session?.user) {
		error(401, m.lower_home_cow_view());
	}

	const { id: achievementId, inviteId } = params;
	const userId = locals.session.user.id;
	const viewerIsAdmin = isAdmin(locals.session.user);

	// Find the invite to verify ownership
	const invite = await prisma.claimEndorsement.findUnique({
		where: {
			id: inviteId,
			achievementId: achievementId,
			organizationId: locals.org.id,
			claimId: null // Only allow deleting pending invites, not endorsements of claims
		}
	});

	if (!invite) {
		error(404, m.lucky_alert_penguin_fry());
	}

	// Authorization check - only creator or admin can delete
	if (invite.creatorId !== userId && !viewerIsAdmin) {
		error(403, m.red_teary_eagle_drip());
	}

	// Delete the invite
	await prisma.claimEndorsement.delete({
		where: {
			id: inviteId
		}
	});

	return apiResponse({
		data: [],
		params,
		meta: {
			type: 'ClaimEndorsement',
			page: 1,
			pageSize: 20,
			includeCount: false
		}
	});
};
