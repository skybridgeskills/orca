import * as m from '$lib/i18n/messages';
import * as dotenv from 'dotenv';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { getAchievement, inviteToClaim } from '$lib/data/achievement';
import { sendOrcaMail } from '$lib/email/sendEmail';
import type { AchievementClaim, Identifier, Prisma } from '@prisma/client';
import stripTags from '$lib/utils/stripTags';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
// import { basicFormDataToCredential } from '$lib/credentials/achievementCredential';
// import { awardFormSchema } from '$lib/data/awardForm';
// import { ValidationError } from 'yup';

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

	return {
		achievement: achievement
	};
};

export const actions = {
	default: async ({ locals, cookies, request, params }) => {
		/*  
		Endpoint use cases:
		 
		*/
		// Award a badge to a user by id (DID) or email identifier, but generate no user claim for it.
		const authenticatedUserId = locals.session?.user?.id;

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
		return result;
	}
} satisfies Actions;
