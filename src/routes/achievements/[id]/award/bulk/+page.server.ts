import { redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { canInviteToAchievement } from '$lib/server/permissions';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.session?.user) redirect(302, `/achievements/${params.id}`);

	const achievement = await prisma.achievement.findFirstOrThrow({
		where: {
			id: params.id,
			organizationId: locals.org.id
		},
		include: {
			_count: {
				select: { achievementClaims: true, claimEndorsements: true }
			}
		}
	});

	const inviteCapability = await canInviteToAchievement({
		user: {
			id: locals.session.user.id,
			orgRole: locals.session.user.orgRole
		},
		achievement: achievement as unknown as App.AchievementWithJson
	});
	if (!inviteCapability) redirect(302, `/achievements/${params.id}`);

	return {
		achievement
	};
};
