import type { RequestHandler } from './$types';
import { apiResponse } from '$lib/utils/api';
import { inviteToClaim } from '$lib/data/achievement';
import type { InviteArgs } from '$lib/data/achievement';

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
		},
		emailIfNew: data.emailIfNew ?? false
	};

	const actionResult = await inviteToClaim(claimData);
	const endorsement = actionResult.data.endorsement;
	const endorsementRecord = endorsement as
		| {
				id?: string;
				claimId?: string | null;
				claim?: { id?: string };
		  }
		| undefined;

	return await apiResponse({
		params,
		data: endorsement ? [endorsement] : [],
		meta: {
			type: 'ClaimEndorsement',
			getTotalCount: async () => 1,
			page: 1,
			pageSize: 1,
			includeCount: false,
			award: {
				created: actionResult.data.created,
				invited: actionResult.data.invited,
				claimId: endorsementRecord?.claimId ?? endorsementRecord?.claim?.id ?? null,
				endorsementId:
					endorsementRecord?.id && endorsementRecord.id !== '' ? endorsementRecord.id : null
			}
		}
	});
};
