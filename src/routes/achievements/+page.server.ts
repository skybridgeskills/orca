import { prisma } from '../../prisma/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Don't include edit controls if not an admin
	let editAchievementCapability = locals.session?.user?.orgRole == 'GENERAL_ADMIN';
	const achievements = await prisma.achievement.findMany({
		where: {
			organizationId: locals.org.id
		}
	});
	const categories = await prisma.achievementCategory.findMany({
		where: {
			organizationId: locals.org.id
		},
		orderBy: {
			weight: 'desc'
		}
	});

	return {
		editAchievementCapability,
		achievements,
		categories
	};
};
