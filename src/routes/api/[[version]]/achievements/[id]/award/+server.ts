import * as m from '$lib/i18n/messages';
import { error, json } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import type { RequestHandler } from './$types';
import { calculatePageAndSize } from '$lib/utils/pagination';
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

	const result = await inviteToClaim(claimData);
	return await apiResponse({
		params,
		data: [result.data],
		meta: {
			type: 'ClaimEndorsement',
			getTotalCount: async () => 1,
			page: 1,
			pageSize: 1,
			includeCount: false
		}
	});
};
