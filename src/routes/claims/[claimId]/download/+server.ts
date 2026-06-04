import * as m from '$lib/i18n/messages';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { prisma } from '$lib/../prisma/client';

import {
	ensureClaimCredential,
	TransactionServiceIssuerError
} from '$lib/credentials/ensureClaimCredential';
import type { AchievementCredential } from '@prisma/client';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

export const POST = async ({ locals, params }: RequestEvent) => {
	if (!locals.session?.user?.id) error(404, m.best_sharp_lamb_enchant());

	const claim = await prisma.achievementClaim.findUnique({
		where: { id: params.claimId },
		include: {
			credential: true,
			achievement: true,
			user: {
				include: { identifiers: true }
			}
		}
	});

	// User can only download their own badges
	if (!claim || claim?.organizationId != locals.org.id || claim?.userId != locals.session.user?.id)
		error(404, m.best_sharp_lamb_enchant());

	let result: AchievementCredential;
	try {
		result = await ensureClaimCredential(claim, locals.org, {
			regenerateIfStale: true,
			creatorUserId: locals.session.user.id
		});
	} catch (err) {
		if (err instanceof TransactionServiceIssuerError) {
			error(
				409,
				'This organization is configured for wallet exchange. Use POST /claims/[id]/exchange.'
			);
		}
		if (err instanceof IssuerMisconfiguredError) {
			error(
				503,
				'Issuer signing key is no longer available. An administrator must update issuer settings.'
			);
		}
		throw err;
	}

	return json(result.json);
};
