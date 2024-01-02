import * as m from '$lib/i18n/messages';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '../../../prisma/client';
import { calculatePageAndSize } from '$lib/utils/pagination';

export const load: PageServerLoad = async ({ url, locals, params }) => {
	// redirect user if logged out
	if (!locals.session?.user) throw redirect(302, `/`);

	const { page, pageSize } = calculatePageAndSize(url);

	const member = await prisma.user.findUniqueOrThrow({
		where: {
			id: params.id
		},
		include: {
			identifiers: true,
			receivedAchievementClaims: {
				where: {
					claimStatus: {
						in: ['ACCEPTED', 'UNACCEPTED']
					}
				},
				include: { achievement: true },
				skip: (page - 1) * pageSize,
				take: pageSize,
				orderBy: { createdOn: 'desc' }
			},
			_count: {
				select: { receivedAchievementClaims: true }
			}
		}
	});
	if (member.organizationId != locals.org.id) throw error(404, m.member_notFoundError());

	return {
		member
	};
};
