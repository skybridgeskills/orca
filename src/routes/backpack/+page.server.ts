import * as dotenv from 'dotenv';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { calculatePageAndSize } from '$lib/utils/pagination';

dotenv.config();

export const load: PageServerLoad = async ({ url, locals, params }) => {
	// redirect user if logged out
	if (!locals.session?.user) redirect(302, `/`);

	const { page, pageSize } = calculatePageAndSize(url);

	const achievementClaims = await prisma.achievementClaim.findMany({
		where: {
			organizationId: locals.org.id,
			userId: locals.session.user.id
		},
		include: {
			achievement: true
		},
		skip: (page - 1) * pageSize,
		take: pageSize,
		orderBy: { createdOn: 'desc' }
	});

	const achievementCount = await prisma.achievementClaim.count({
		where: {
			organizationId: locals.org.id,
			userId: locals.session.user.id
		}
	});

	const outstandingInvites = await prisma.claimEndorsement.findMany({
		where: {
			inviteeEmail: {
				in: locals.session.user.identifiers
					.filter((i) => i.type == 'EMAIL')
					.map((i) => i.identifier)
			},
			organizationId: locals.org.id,
			claimId: null
		},
		distinct: ['achievementId'],
		include: {
			achievement: true
		}
	});

	return {
		achievementClaims,
		achievementCount,
		outstandingInvites
	};
};
