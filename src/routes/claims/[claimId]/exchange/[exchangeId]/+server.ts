import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { deriveExchangeState, type ExchangeError, type ExchangeStatus } from '$lib/exchange/state';
import * as m from '$lib/i18n/messages';
import { isSuspended } from '$lib/server/moderation/suspension';
import { BadOrgConfigBlobError } from '$lib/server/secrets/orgConfigCrypto';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';
import {
	getExchangeState,
	TransactionServiceUpstreamError
} from '$lib/server/transactionService/client';

import type { RequestEvent } from './$types';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Status of a Send to wallet exchange, for the claim owner's modal (checked every 6 s). */
export const GET = async ({ locals, params }: RequestEvent) => {
	if (!locals.session?.user?.id) error(404, m.best_sharp_lamb_enchant());

	const claim = await prisma.achievementClaim.findUnique({
		where: { id: params.claimId },
		select: { id: true, organizationId: true, userId: true, achievementId: true }
	});
	if (!claim || claim.organizationId !== locals.org.id || claim.userId !== locals.session.user.id) {
		error(404, m.best_sharp_lamb_enchant());
	}
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

	const status =
		locals.org.json?.issuer?.type === 'transactionService'
			? await transactionServiceStatus(locals.org, params.exchangeId)
			: await localStatus(locals.org, claim.id, params.exchangeId);
	return json(status, { headers: NO_STORE });
};

async function localStatus(
	org: App.Organization,
	claimId: string,
	exchangeId: string
): Promise<ExchangeStatus> {
	const exchange = await prisma.credentialExchange.findFirst({
		where: { id: exchangeId, organizationId: org.id, claimId }
	});
	if (!exchange) error(404, m.best_sharp_lamb_enchant());
	const errors: ExchangeError[] = Array.isArray(exchange.errors)
		? (exchange.errors as ExchangeError[]).map(({ code, message }) => ({ code, message }))
		: [];
	return {
		state: deriveExchangeState(exchange),
		expiresAt: exchange.expiresAt.toISOString(),
		...(errors.length > 0 ? { errors } : {})
	};
}

// ORCA does not record transaction-service exchange ids, so it cannot confirm this id
// belongs to this claim. Only state and expiry are returned, and only to a signed-in owner
// of a claim in this org.
async function transactionServiceStatus(
	org: App.Organization,
	exchangeId: string
): Promise<ExchangeStatus> {
	try {
		const upstream = await getExchangeState(org, exchangeId);
		if (!upstream) error(404, m.best_sharp_lamb_enchant());
		return { state: upstream.state, expiresAt: upstream.expiresAt };
	} catch (err) {
		if (err instanceof IssuerMisconfiguredError || err instanceof BadOrgConfigBlobError) {
			error(503, 'Issuer is misconfigured.');
		}
		if (err instanceof TransactionServiceUpstreamError) {
			error(502, "We couldn't reach the issuer service.");
		}
		throw err;
	}
}
