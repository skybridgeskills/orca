import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '../../prisma/client';
import { calculatePageAndSize } from '$lib/utils/pagination';

export const load: PageServerLoad = async ({ url, locals, params }) => {
	// redirect user if logged out
	if (!locals.session?.user) throw redirect(302, `/`);

	const { page, pageSize } = calculatePageAndSize(url);

	const users = await prisma.user.findMany({
		where: {
			organizationId: locals.org.id
		},
		skip: (page - 1) * pageSize,
		take: pageSize,
		orderBy: [
			{
				orgRole: 'asc'
			},
			{
				familyName: 'asc'
			}
		]
	});

	const count = prisma.user.count({
		where: {
			organizationId: locals.org.id
		}
	});

	return {
		members: users,
		count
	};
};
