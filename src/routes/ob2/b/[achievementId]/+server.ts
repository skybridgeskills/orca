import * as m from '$lib/i18n/messages';
import { error, redirect } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { prisma } from '../../../../prisma/client';
import { badgeClassFromAchievement } from '$lib/ob2/badgeClass';

export const GET = async ({ request, params, locals }: RequestEvent) => {
	const accept = request.headers.get('Accept') ?? '';
	const acceptPieces = accept.split(',');
	const isHtml = acceptPieces.includes('text/html'); // TODO replace with a more glamorous priority check

	if (isHtml) redirect(302, `/achievements/${params.achievementId}`);
	else {
		const achievement = await prisma.achievement.findUniqueOrThrow({
			where: {
				id: params.achievementId
			},
			include: {
				organization: true
			}
		});
		if (achievement?.organizationId === locals.org.id)
			return json(badgeClassFromAchievement(achievement));
		else error(404, m.notFound());
	}
};
