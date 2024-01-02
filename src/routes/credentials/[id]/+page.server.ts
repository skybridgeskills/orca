import { prisma } from '../../../prisma/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	// Don't include edit controls if not an admin
	let editCredentialCapability = locals.session?.user?.orgRole == 'GENERAL_ADMIN';
	let credential = prisma.achievementCredential.findFirstOrThrow({
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
