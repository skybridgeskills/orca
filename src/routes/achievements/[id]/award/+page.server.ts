import { redirect } from '@sveltejs/kit';
import * as dotenv from 'dotenv';

import { prisma } from '$lib/../prisma/client';
import { inviteToClaim } from '$lib/data/achievement';
import { canInviteToAchievement } from '$lib/server/permissions';
import stripTags from '$lib/utils/stripTags';

import type { PageServerLoad, Actions } from './$types';
dotenv.config();

export const load: PageServerLoad = async ({ locals, params }) => {
	// redirect user if logged out
	if (!locals.session?.user) redirect(302, `/achievements/${params.id}`);

	const achievement = await prisma.achievement.findFirstOrThrow({
		where: {
			id: params.id,
			organizationId: locals.org.id
		},
		include: {
			achievementConfig: true,
			_count: {
				select: { achievementClaims: true, claimEndorsements: true }
			}
		}
	});

	const inviteCapability = await canInviteToAchievement({
		user: {
			id: locals.session.user.id,
			orgRole: locals.session.user.orgRole
		},
		achievementConfig: achievement.achievementConfig as App.AchievementConfig | null
	});
	if (!inviteCapability) redirect(302, `/achievements/${params.id}`);

	return {
		achievement: achievement
	};
};

export const actions = {
	default: async ({ locals, request, params }) => {
		/*  
		Endpoint use cases:
		 
		*/
		// Award a badge to a user by id (DID) or email identifier, but generate no user claim for it.
		const requestData = await request.formData();

		const claimData = {
			achievementId: params.id,
			org: locals.org,
			inviteeEmail: stripTags(requestData.get('email')?.toString()) || '',
			session: locals.session,
			json: JSON.stringify({
				id: stripTags(requestData.get('evidenceUrl')?.toString()),
				narrative: stripTags(requestData.get('narrative')?.toString())
			} as App.EvidenceItem)
		};
		const result = await inviteToClaim(claimData);
		return result.data;
	}
} satisfies Actions;
