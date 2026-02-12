import { prisma } from '../../prisma/client';
import type { PageServerLoad } from './$types';
import { canEditAchievements } from '$lib/server/permissions';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Check if user has permission to edit achievements
	let editAchievementCapability = false;
	let editCategoriesCapability = false;
	if (locals.session?.user?.id) {
		editCategoriesCapability = ['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(
			locals.session.user.orgRole || 'none'
		);
		editAchievementCapability = await canEditAchievements({
			user: {
				id: locals.session.user.id,
				orgRole: locals.session.user.orgRole
			},
			org: {
				id: locals.org.id,
				json: locals.org.json
			}
		});
	}

	const achievements = await prisma.achievement.findMany({
		where: {
			organizationId: locals.org.id
		},
		include: {
			achievementConfig: true
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
		editCategoriesCapability,
		achievements,
		categories
	};
};
