import type { CredentialExchange } from '@prisma/client';

import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

// Wire format mirrors the DCC transaction service's claim workflow, so a wallet sees the
// same exchange whether ORCA or the transaction service hosts it.

/** The org's origin, e.g. `https://badgistan.orcapods.org`. Also the DID-auth `domain`. */
export function orgOrigin(org: Pick<App.Organization, 'domain'>): string {
	return `${PUBLIC_HTTP_PROTOCOL}://${org.domain}`;
}

export function exchangeServiceEndpoint(
	org: Pick<App.Organization, 'domain'>,
	exchangeId: string
): string {
	return `${orgOrigin(org)}/workflows/claim/exchanges/${exchangeId}`;
}

/**
 * DID-authentication request (transaction-service `getDIDAuthVPR`), limited to the
 * cryptosuites ORCA verifies.
 */
export function buildDidAuthVpr(
	org: Pick<App.Organization, 'domain'>,
	exchange: Pick<CredentialExchange, 'id' | 'challenge'>
) {
	const serviceEndpoint = exchangeServiceEndpoint(org, exchange.id);
	return {
		query: { type: 'DIDAuthentication' },
		interact: {
			service: [
				{ type: 'VerifiableCredentialApiExchangeService', serviceEndpoint },
				{ type: 'UnmediatedPresentationService2021', serviceEndpoint }
			]
		},
		challenge: exchange.challenge,
		domain: orgOrigin(org),
		acceptedCryptosuites: [
			{ cryptosuite: 'eddsa-rdfc-2022' },
			{ cryptosuite: 'ed25519-signature-2020' }
		]
	};
}

/**
 * LCW mobile deep link (transaction-service `issuerAuthChallengeQuery`). LCW posts a bare
 * presentation, so it is pointed at the `/bare-vp` doorway. Parameter order and the
 * unencoded challenge match the transaction service byte for byte.
 */
export function lcwDeepLink(serviceEndpoint: string, challenge: string): string {
	const bareVpEndpoint = `${serviceEndpoint}/bare-vp`;
	const issuer = new URL(bareVpEndpoint).hostname;
	return `https://lcw.app/request.html?issuer=${issuer}&auth_type=bearer&challenge=${challenge}&vc_request_url=${encodeURIComponent(
		bareVpEndpoint
	)}`;
}

export function buildLocalProtocols(
	org: Pick<App.Organization, 'domain'>,
	exchange: Pick<CredentialExchange, 'id' | 'challenge'>
) {
	const vcapi = exchangeServiceEndpoint(org, exchange.id);
	return {
		iu: `${orgOrigin(org)}/interactions/${exchange.id}?iuv=1`,
		vcapi,
		lcw: lcwDeepLink(vcapi, exchange.challenge),
		verifiablePresentationRequest: buildDidAuthVpr(org, exchange)
	};
}
