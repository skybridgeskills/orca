import type { RequestHandler } from './$types';
import { apiResponse } from '$lib/utils/api';
import { inviteToClaim, InviteArgs } from '$lib/data/achievement';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	const data = await request.json();

	const claimData: InviteArgs = {
		achievementId: params.id,
		org: locals.org,
		session: locals.session,
		inviteeEmail: data.email,
		json: {
			id: data.evidenceUrl,
			narrative: data.narrative
		}
	};

	const actionResult = await inviteToClaim(claimData);
	const endorsement = actionResult.data.endorsement;

	return await apiResponse({
		params,
		data: endorsement ? [endorsement] : [],
		meta: {
			type: 'ClaimEndorsement',
			getTotalCount: async () => 1,
			page: 1,
			pageSize: 1,
			includeCount: false
		}
	});
};
