import { prisma } from '$lib/../prisma/client';

export const getAchievement = async (achievementId: string, orgId: string) => {
	return await prisma.achievement.findFirstOrThrow({
		where: {
			id: achievementId,
			organizationId: orgId
		},
		include: {
			category: true,
			achievementConfig: {
				include: { claimRequires: true, reviewRequires: true }
			}
		}
	});
};
