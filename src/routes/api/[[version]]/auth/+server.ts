import * as m from '$lib/i18n/messages';
import { error, json } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { prefersHtml } from '$lib/utils/contentNegotiation';
import type { RequestHandler } from './$types';
import { calculatePageAndSize } from '$lib/utils/pagination';
import { apiResponse } from '$lib/utils/api';
import { createRegistrationOptionsForUser } from '$lib/utils/passkeys'

export const GET: RequestHandler = async ({ url, request, params, locals }) => {
	if (prefersHtml(request)) throw redirect(302, '/');

    const user = locals.session?.user 
    if(!user){
        throw error(403, m.error_unauthorized());        
    }


    const data = await createRegistrationOptionsForUser(user)
	return await apiResponse({
		params,
		data: {...data, id:"placeholder"},
		meta: {
			type: 'AchievementCategory',
			getTotalCount: async () => {
				return 1
			},
			page: 1,
			pageSize: 1,
            includeCount: false
		}
	});
};
