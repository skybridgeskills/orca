import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

import {
	buildDidAuthVpr,
	buildLocalProtocols,
	exchangeServiceEndpoint,
	lcwDeepLink,
	orgOrigin
} from './protocols';

const ORG = { domain: 'badgistan.orcapods.org' };
const EXCHANGE = { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', challenge: 'Xy_z-123AbC' };
const VCAPI =
	'https://badgistan.orcapods.org/workflows/claim/exchanges/a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('exchange protocols', () => {
	it('builds the org origin and the VC-API exchange endpoint', () => {
		expect(orgOrigin(ORG)).toBe('https://badgistan.orcapods.org');
		expect(exchangeServiceEndpoint(ORG, EXCHANGE.id)).toBe(VCAPI);
	});

	it('pins the DID-auth verifiable presentation request', () => {
		expect(buildDidAuthVpr(ORG, EXCHANGE)).toStrictEqual({
			query: { type: 'DIDAuthentication' },
			interact: {
				service: [
					{ type: 'VerifiableCredentialApiExchangeService', serviceEndpoint: VCAPI },
					{ type: 'UnmediatedPresentationService2021', serviceEndpoint: VCAPI }
				]
			},
			challenge: 'Xy_z-123AbC',
			domain: 'https://badgistan.orcapods.org',
			acceptedCryptosuites: [
				{ cryptosuite: 'eddsa-rdfc-2022' },
				{ cryptosuite: 'ed25519-signature-2020' }
			]
		});
	});

	it('pins the LCW deep link (parameter order, unencoded challenge, /bare-vp target)', () => {
		expect(lcwDeepLink(VCAPI, EXCHANGE.challenge)).toBe(
			'https://lcw.app/request.html?issuer=badgistan.orcapods.org&auth_type=bearer' +
				'&challenge=Xy_z-123AbC' +
				'&vc_request_url=https%3A%2F%2Fbadgistan.orcapods.org%2Fworkflows%2Fclaim%2Fexchanges%2Fa1b2c3d4-e5f6-7890-abcd-ef1234567890%2Fbare-vp'
		);
		expect(lcwDeepLink(VCAPI, EXCHANGE.challenge)).toBe(
			`https://lcw.app/request.html?issuer=badgistan.orcapods.org&auth_type=bearer&challenge=${EXCHANGE.challenge}&vc_request_url=${encodeURIComponent(`${VCAPI}/bare-vp`)}`
		);
	});

	it('uses the hostname only (no port) as the LCW issuer', () => {
		const link = lcwDeepLink('https://localhost:5173/workflows/claim/exchanges/x', 'c');
		expect(new URL(link).searchParams.get('issuer')).toBe('localhost');
	});

	it('builds the protocols object with iu, vcapi, lcw and the VPR', () => {
		expect(buildLocalProtocols(ORG, EXCHANGE)).toStrictEqual({
			iu: 'https://badgistan.orcapods.org/interactions/a1b2c3d4-e5f6-7890-abcd-ef1234567890?iuv=1',
			vcapi: VCAPI,
			lcw: lcwDeepLink(VCAPI, EXCHANGE.challenge),
			verifiablePresentationRequest: buildDidAuthVpr(ORG, EXCHANGE)
		});
	});
});
