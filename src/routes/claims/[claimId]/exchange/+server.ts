import * as m from '$lib/i18n/messages';
import { error, json } from '@sveltejs/kit';
import type { Organization } from '@prisma/client';
import type { RequestEvent } from './$types';
import { prisma } from '$lib/../prisma/client';

import { buildAchievementCredentialTemplate } from '$lib/credentials/credentialTemplate';
import {
	createExchange,
	TransactionServiceUpstreamError
} from '$lib/server/transactionService/client';
import { isExchangeEnabled } from '$lib/server/transactionService/config';
import { BadOrgConfigBlobError } from '$lib/server/secrets/orgConfigCrypto';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

export const POST = async ({ locals, params }: RequestEvent) => {
	if (!locals.session?.user?.id) throw error(404, m.best_sharp_lamb_enchant());

	if (!isExchangeEnabled(locals.org)) {
		throw error(409, 'This organization is not configured for wallet exchange.');
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
		throw error(404, m.best_sharp_lamb_enchant());
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
			throw error(409, 'Issuer is misconfigured.');
		}
		if (err instanceof BadOrgConfigBlobError) {
			throw error(503, 'Issuer is misconfigured.');
		}
		if (err instanceof TransactionServiceUpstreamError) {
			throw error(502, "We couldn't reach the issuer service.");
		}
		console.error('Unexpected error creating exchange', err);
		throw error(500, 'Unexpected error.');
	}
};
