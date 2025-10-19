import * as m from '$lib/i18n/messages';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { apiResponse } from '$lib/utils/api';

export const DELETE = async ({ params, locals }) => {
	// Authentication check
	if (!locals.session?.user) {
		throw error(401, m.error_unauthorized());
	}

	const { id: achievementId, inviteId } = params;
	const userId = locals.session.user.id;
	const isAdmin = ['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(
		locals.session.user.orgRole || 'none'
	);

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
		throw error(404, m.lucky_alert_penguin_fry());
	}

	// Authorization check - only creator or admin can delete
	if (invite.creatorId !== userId && !isAdmin) {
		throw error(403, m.red_teary_eagle_drip());
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
