import { prisma } from '../../prisma/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// Don't include edit controls if not an admin
	let editOrganizationCapability = locals.session?.user?.orgRole == 'GENERAL_ADMIN';

	return {
		editOrganizationCapability
	};
};
