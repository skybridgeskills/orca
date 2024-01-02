import { prisma } from '../prisma/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const highlightedAchievements = await prisma.achievement.findMany({
		take: 4,
		where: {
			organizationId: locals.org.id
		},
		orderBy: {
			achievementClaims: {
				_count: 'desc'
			}
		},
		include: {
			_count: {
				select: {
					achievementClaims: true
				}
			}
		}
	});

	return {
		highlightedAchievements: highlightedAchievements.filter((a) => a._count.achievementClaims > 0)
	};
};
