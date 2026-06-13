import type { AchievementCredential } from '@prisma/client';
import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import {
	ensureClaimCredential,
	TransactionServiceIssuerError
} from '$lib/credentials/ensureClaimCredential';
import * as m from '$lib/i18n/messages';
import { isSuspended } from '$lib/server/moderation/suspension';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

import type { RequestEvent } from './$types';

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

	// P5 moderation: block credential issuance/download when the claim or its underlying
	// achievement is suspended (even the owner cannot mint a credential for suspended
	// content).
	if (
		(await isSuspended({ originOrgId: locals.org.id, targetType: 'CLAIM', targetId: claim.id })) ||
		(await isSuspended({
			originOrgId: locals.org.id,
			targetType: 'ACHIEVEMENT',
			targetId: claim.achievementId
		}))
	) {
		error(403, m.glum_stout_seal_block());
	}

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
