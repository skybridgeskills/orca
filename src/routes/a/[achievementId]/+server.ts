import * as m from '$lib/i18n/messages';
import { error, redirect } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { prisma } from '../../../prisma/client';
import { ob3AchievementFromAchievement } from '$lib/ob3/achievement';

export const GET = async ({ request, params, locals }: RequestEvent) => {
	const accept = request.headers.get('Accept') ?? '';
	const acceptPieces = accept.split(',');
	const isHtml = acceptPieces.includes('text/html'); // TODO replace with a more glamorous priority check

	if (isHtml) throw redirect(302, `/claims/${params.achievementId}/public`);
	else {
		const achievement = await prisma.achievement.findUniqueOrThrow({
			where: {
				id: params.achievementId
			}
		});
		if (achievement?.organizationId === locals.org.id)
			return json(
				ob3AchievementFromAchievement(
					{
						...achievement,
						organization: locals.org
					},
					true
				)
			);
		else throw error(404, m.notFound());
	}
};
