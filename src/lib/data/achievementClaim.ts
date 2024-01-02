import { prisma } from '$lib/../prisma/client';
import type { AchievementClaim, ClaimEndorsement } from '@prisma/client';

export const getUserClaim = async (
	userId: string,
	achievementId: string,
	organizationId: string
) => {
	return await prisma.achievementClaim.findUnique({
		where: {
			userId_achievementId: {
				userId,
				achievementId
			}
		}
	});
};

interface EvidenceItem {
	narrative?: string;
	id?: string;
}
