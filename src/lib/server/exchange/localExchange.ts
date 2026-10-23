import { randomBytes, randomUUID } from 'node:crypto';

import { Prisma, type CredentialExchange } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';
import { achievementClaimToCredential } from '$lib/credentials/achievementCredential';
import { isSuspended } from '$lib/server/moderation/suspension';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

import { EXCHANGE_TTL_MS } from './constants';
import { DidAuthError, verifyDidAuthPresentation } from './didAuth';
import { buildDidAuthVpr, buildLocalProtocols, orgOrigin } from './protocols';

/** One entry of `CredentialExchange.errors`. Messages are safe to show the claim owner. */
export type StoredExchangeError = { code: string; message: string; at: string };

/** Outcome of a wallet request, mapped to an HTTP response by the route. */
export type ParticipateResult =
	| { status: 200; body: unknown }
	| { status: 400; body: { error: string; message: string } }
	| { status: 404; body: { error: 'not_found' } }
	| { status: 410; body: { error: 'exchange_closed' } }
	| { status: 500 | 503; body: { error: 'issuance_failed' } };

const NOT_FOUND = { status: 404, body: { error: 'not_found' } } as const;
const CLOSED = { status: 410, body: { error: 'exchange_closed' } } as const;

export async function createLocalExchange(
	org: App.Organization,
	claimId: string
): Promise<{
	exchangeId: string;
	protocols: ReturnType<typeof buildLocalProtocols>;
	expiresAt: string;
}> {
	const exchange = await prisma.credentialExchange.create({
		data: {
			organization: { connect: { id: org.id } },
			claim: { connect: { id: claimId } },
			challenge: randomBytes(32).toString('base64url'),
			expiresAt: new Date(Date.now() + EXCHANGE_TTL_MS)
		}
	});
	return {
		exchangeId: exchange.id,
		protocols: buildLocalProtocols(org, exchange),
		expiresAt: exchange.expiresAt.toISOString()
	};
}

/** Org-scoped lookup: an exchange id never resolves on another org's domain. */
export function findExchange(org: App.Organization, exchangeId: string) {
	return prisma.credentialExchange.findFirst({
		where: { id: exchangeId, organizationId: org.id }
	});
}

const hasErrors = (exchange: Pick<CredentialExchange, 'errors'>) =>
	Array.isArray(exchange.errors) && exchange.errors.length > 0;

/** Expired, completed or invalid exchanges accept no further requests. */
export const isClosed = (exchange: CredentialExchange, now = new Date()) =>
	exchange.completedAt !== null || hasErrors(exchange) || exchange.expiresAt <= now;

/**
 * Records a failure, which makes the exchange invalid (terminal). `release` also clears
 * the single-use marker; both happen in one write so the exchange never looks open.
 */
async function appendError(
	exchange: CredentialExchange,
	code: string,
	message: string,
	{ release = false }: { release?: boolean } = {}
) {
	const previous = Array.isArray(exchange.errors) ? (exchange.errors as StoredExchangeError[]) : [];
	const entry: StoredExchangeError = { code, message, at: new Date().toISOString() };
	await prisma.credentialExchange.update({
		where: { id: exchange.id },
		data: { errors: [...previous, entry], ...(release ? { completedAt: null } : {}) }
	});
}

/** A wrapped VP, or a bare one; anything else asks for the DID-auth request. */
function isPresentationRequest(body: unknown): boolean {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
	if ('verifiablePresentation' in body || 'proof' in body) return true;
	const type = (body as { type?: unknown }).type;
	return (
		type === 'VerifiablePresentation' ||
		(Array.isArray(type) && type.includes('VerifiablePresentation'))
	);
}

/**
 * Handles one wallet request against an ORCA-hosted claim exchange (transaction-service
 * claim workflow semantics): an empty body gets the DID-auth request; a DID-auth
 * presentation gets a credential bound to the authenticated DID.
 */
export async function participate(
	org: App.Organization,
	exchangeId: string,
	body: unknown,
	{ bareVp }: { bareVp: boolean }
): Promise<ParticipateResult> {
	const exchange = await findExchange(org, exchangeId);
	if (!exchange) return NOT_FOUND;
	if (isClosed(exchange)) return CLOSED;

	if (!isPresentationRequest(body)) {
		if (!exchange.startedAt) {
			await prisma.credentialExchange.updateMany({
				where: { id: exchange.id, startedAt: null },
				data: { startedAt: new Date() }
			});
		}
		return { status: 200, body: { verifiablePresentationRequest: buildDidAuthVpr(org, exchange) } };
	}

	let holderDid: string;
	try {
		({ holderDid } = await verifyDidAuthPresentation({
			body,
			challenge: exchange.challenge,
			domain: orgOrigin(org)
		}));
	} catch (err) {
		if (err instanceof DidAuthError) {
			await appendError(exchange, err.code, err.message);
			return { status: 400, body: { error: err.code, message: err.message } };
		}
		throw err;
	}

	// Single use: claim the exchange atomically before signing, so a double-POST or a race
	// between wallets issues at most one credential.
	const now = new Date();
	const { count } = await prisma.credentialExchange.updateMany({
		where: {
			id: exchange.id,
			organizationId: org.id,
			completedAt: null,
			errors: { equals: Prisma.AnyNull },
			expiresAt: { gt: now }
		},
		data: { completedAt: now }
	});
	if (count === 0) return CLOSED;

	const release = (code: string, message: string) =>
		appendError(exchange, code, message, { release: true });

	const claim = await prisma.achievementClaim.findUnique({
		where: { id: exchange.claimId },
		include: { achievement: true, user: { include: { identifiers: true } } }
	});
	if (
		!claim ||
		claim.organizationId !== org.id ||
		claim.claimStatus !== 'ACCEPTED' ||
		(await isSuspended({ originOrgId: org.id, targetType: 'CLAIM', targetId: claim.id })) ||
		(await isSuspended({
			originOrgId: org.id,
			targetType: 'ACHIEVEMENT',
			targetId: claim.achievementId
		}))
	) {
		await release('claim_unavailable', 'This badge can no longer be sent to a wallet.');
		return CLOSED;
	}

	let credential: App.OpenBadgeCredential;
	try {
		credential = await achievementClaimToCredential(claim, org, {
			subjectId: holderDid,
			credentialId: `urn:uuid:${randomUUID()}`
		});
		await prisma.achievementCredential.create({
			data: {
				organization: { connect: { id: org.id } },
				achievement: { connect: { id: claim.achievementId } },
				creatorUser: { connect: { id: claim.userId } },
				issuedFor: { connect: { id: claim.id } },
				identifier: credential.id,
				subjectId: holderDid,
				json: JSON.parse(JSON.stringify(credential)) as Prisma.InputJsonValue
			}
		});
	} catch (err) {
		console.error('Exchange issuance failed', err);
		await release('issuance_failed', 'The badge could not be issued. Please try again.');
		return {
			status: err instanceof IssuerMisconfiguredError ? 503 : 500,
			body: { error: 'issuance_failed' }
		};
	}

	const presentation = {
		'@context': ['https://www.w3.org/ns/credentials/v2'],
		type: ['VerifiablePresentation'],
		verifiableCredential: [credential]
	};
	return { status: 200, body: bareVp ? presentation : { verifiablePresentation: presentation } };
}
