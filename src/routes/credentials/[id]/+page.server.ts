import { isGeneralAdmin } from '$lib/permissions/isAdmin';

import { prisma } from '../../../prisma/client';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Don't include edit controls if not an admin
	const editCredentialCapability = isGeneralAdmin(locals.session?.user);
	const credential = await prisma.achievementCredential.findFirstOrThrow({
		where: {
			organizationId: locals.org.id,
			id: params.id
		},
		include: {
			achievement: true
		}
	});

	return {
		editCredentialCapability,
		credential
	};
};
