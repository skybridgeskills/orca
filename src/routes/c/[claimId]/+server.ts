import * as m from '$lib/i18n/messages';
import { error, redirect } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { prisma } from '../../../prisma/client';
import { badgeAssertionFromAchievementClaim } from '$lib/ob2/badgeAssertion';

export const GET = async ({ request, params, locals }: RequestEvent) => {
	const accept = request.headers.get('Accept') ?? '';
	const acceptPieces = accept.split(',');
	const isHtml = acceptPieces.includes('text/html'); // TODO replace with a more glamorous priority check

	if (isHtml) throw redirect(302, `/claims/${params.claimId}/public`);
	else {
		const claim = await prisma.achievementClaim.findUniqueOrThrow({
			where: {
				id: params.claimId
			},
			include: {
				achievement: {
					include: {
						organization: true
					}
				},
				user: {
					include: {
						identifiers: true
					}
				}
			}
		});
		if (!claim?.validFrom || claim?.claimStatus !== 'ACCEPTED')
			throw error(404, m.claim_notFoundOrNotShareableError());
		if (claim?.organizationId === locals.org.id)
			return json(badgeAssertionFromAchievementClaim(claim));
		// TODO return the OB3 version, once access control is properly implemented
		else throw error(404, m.notFound());
	}
};
