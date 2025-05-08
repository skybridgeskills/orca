import { error } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import type { RequestEvent } from './$types';
import { apiResponse } from '$lib/utils/api';

export const DELETE = async ({ params, locals }: RequestEvent) => {
	// Authentication check
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	const { id: achievementId, inviteId } = params;
	const userId = locals.session.user.id;
	const isAdmin = locals.session.user.orgRole === 'GENERAL_ADMIN';

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
		throw error(404, 'Invite not found');
	}

	// Authorization check - only creator or admin can delete
	if (invite.creatorId !== userId && !isAdmin) {
		throw error(403, 'You are not authorized to delete this invite');
	}

	// Delete the invite
	await prisma.claimEndorsement.delete({
		where: {
			id: inviteId
		}
	});

	return apiResponse({
		params,
		data: { success: true },
		meta: {
			type: 'ClaimEndorsement',
			message: 'Invite deleted successfully'
		}
	});
};