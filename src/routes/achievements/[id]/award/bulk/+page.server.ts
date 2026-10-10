import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.session?.user) throw redirect(302, `/achievements/${params.id}`);

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
		achievement
	};
};
