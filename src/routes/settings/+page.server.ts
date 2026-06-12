import type { Visibility } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';

import * as m from '$lib/i18n/messages';
import { isVisibility } from '$lib/server/visibility';

import { prisma } from '../../prisma/client';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// redirect user if logged out or doesn't hold org admin role
	if (!locals.session?.user?.id) redirect(302, `/`);
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.session?.user?.id) error(403, m.silly_top_marten_view());

		const requestData = await request.formData();
		const givenName: string = requestData.get('givenName')?.toString() ?? '';
		const familyName: string = requestData.get('familyName')?.toString() ?? '';
		const defaultVisibilityRaw = requestData.get('defaultVisibility')?.toString();
		const defaultVisibility: Visibility = isVisibility(defaultVisibilityRaw)
			? defaultVisibilityRaw
			: 'COMMUNITY';
		const identifierVisibilityRaw = requestData.get('identifierVisibility')?.toString();
		const identifierVisibility: Visibility = isVisibility(identifierVisibilityRaw)
			? identifierVisibilityRaw
			: 'COMMUNITY';

		const user = await prisma.user.update({
			where: { id: locals.session.user.id },
			data: {
				givenName,
				familyName,
				defaultVisibility
			},
			include: {
				identifiers: true
			}
		});

		if (identifierVisibility !== user.identifiers.find(() => true)?.visibility) {
			await prisma.identifier.updateMany({
				where: { userId: locals.session.user.id },
				data: { visibility: identifierVisibility }
			});

			// The identifiers returned from the updateMany above are a BatchResult not a GetResult and can't be used
			// to augment the user previously fetched, so we'll fetch user again.
			locals.session.user = await prisma.user.findUnique({
				where: { id: locals.session.user.id },
				include: { identifiers: true }
			});
		} else {
			locals.session.user = user;
		}

		return locals.session.user;
	}
};
