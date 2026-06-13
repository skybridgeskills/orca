import type { Organization } from '@prisma/client';
import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { buildAchievementCredentialTemplate } from '$lib/credentials/credentialTemplate';
import * as m from '$lib/i18n/messages';
import { isSuspended } from '$lib/server/moderation/suspension';
import { BadOrgConfigBlobError } from '$lib/server/secrets/orgConfigCrypto';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';
import {
	createExchange,
	TransactionServiceUpstreamError
} from '$lib/server/transactionService/client';
import { isExchangeEnabled } from '$lib/server/transactionService/config';

import type { RequestEvent } from './$types';

export const POST = async ({ locals, params }: RequestEvent) => {
	if (!locals.session?.user?.id) error(404, m.best_sharp_lamb_enchant());

	if (!isExchangeEnabled(locals.org)) {
		error(409, 'This organization is not configured for wallet exchange.');
	}

	const claim = await prisma.achievementClaim.findUnique({
		where: { id: params.claimId },
		include: {
			achievement: true,
			user: { include: { identifiers: true } }
		}
	});

	if (
		!claim ||
		claim.organizationId !== locals.org.id ||
		claim.userId !== locals.session.user.id ||
		claim.claimStatus !== 'ACCEPTED'
	) {
		error(404, m.best_sharp_lamb_enchant());
	}

	// P5 moderation: block wallet exchange (credential issuance) for a suspended claim or
	// a suspended achievement.
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

	const template = buildAchievementCredentialTemplate(claim, locals.org as Organization, {
		includeSubjectId: false
	});

	try {
		const exchange = await createExchange(locals.org, { vc: template });
		const exchangeBody = await json(exchange);
		return exchangeBody;
	} catch (err) {
		if (err instanceof IssuerMisconfiguredError) {
			error(409, 'Issuer is misconfigured.');
		}
		if (err instanceof BadOrgConfigBlobError) {
			error(503, 'Issuer is misconfigured.');
		}
		if (err instanceof TransactionServiceUpstreamError) {
			error(502, "We couldn't reach the issuer service.");
		}
		console.error('Unexpected error creating exchange', err);
		error(500, 'Unexpected error.');
	}
};
