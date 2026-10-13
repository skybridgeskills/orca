import { ClaimStatus, type CredentialExchange } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DidAuthError } from '$lib/server/exchange/didAuth';
import { buildDidAuthVpr } from '$lib/server/exchange/protocols';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockUpdateMany = vi.hoisted(() => vi.fn());
const mockClaimFindUnique = vi.hoisted(() => vi.fn());
const mockCredentialCreate = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		credentialExchange: {
			findFirst: mockFindFirst,
			update: mockUpdate,
			updateMany: mockUpdateMany
		},
		achievementClaim: { findUnique: mockClaimFindUnique },
		achievementCredential: { create: mockCredentialCreate }
	}
}));

const mockIsSuspended = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/moderation/suspension', () => ({ isSuspended: mockIsSuspended }));

const mockVerify = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/exchange/didAuth', async (importOriginal) => {
	const mod = await importOriginal<typeof import('$lib/server/exchange/didAuth')>();
	return { ...mod, verifyDidAuthPresentation: mockVerify };
});

const mockToCredential = vi.hoisted(() => vi.fn());
vi.mock('$lib/credentials/achievementCredential', () => ({
	achievementClaimToCredential: mockToCredential
}));

import * as route from './+server';
import * as bareVpRoute from './bare-vp/+server';

// Both routes take the same event shape; their generated types differ only by route id.
type Handler = (event: unknown) => Response | Promise<Response>;
const POST = route.POST as Handler;
const OPTIONS = route.OPTIONS as Handler;
const BARE_POST = bareVpRoute.POST as Handler;
const BARE_OPTIONS = bareVpRoute.OPTIONS as Handler;

const HOLDER = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
const ORG = {
	id: 'org-1',
	domain: 'badgistan.orcapods.org',
	json: { issuer: { type: 'signingKey', signingKeyId: 'key-1' } }
} as App.Organization;

const EXCHANGE: CredentialExchange = {
	id: 'ex-1',
	organizationId: 'org-1',
	claimId: 'claim-1',
	challenge: 'challenge-abc',
	expiresAt: new Date(Date.now() + 10 * 60 * 1000),
	startedAt: null,
	completedAt: null,
	errors: null,
	createdAt: new Date()
};

const SIGNED_VC = { id: 'urn:uuid:fresh', type: ['VerifiableCredential', 'OpenBadgeCredential'] };
const VP = { type: ['VerifiablePresentation'], holder: HOLDER, proof: {} };
const PRESENTATION = {
	'@context': ['https://www.w3.org/ns/credentials/v2'],
	type: ['VerifiablePresentation'],
	verifiableCredential: [SIGNED_VC]
};

function event(body?: string, exchangeId = 'ex-1') {
	return {
		locals: { org: ORG },
		params: { exchangeId },
		request: new Request(`https://badgistan.orcapods.org/workflows/claim/exchanges/${exchangeId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Origin: 'https://learncard.app' },
			body
		})
	};
}

async function call(handler: Handler, body?: string, exchangeId?: string) {
	return (await handler(event(body, exchangeId))) as Response;
}

function expectWalletHeaders(res: Response) {
	expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
	expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Accept');
	expect(res.headers.get('Access-Control-Max-Age')).toBe('600');
	expect(res.headers.get('Cache-Control')).toBe('no-store');
}

describe.each([
	['/workflows/claim/exchanges/[exchangeId]', POST, OPTIONS],
	['/workflows/claim/exchanges/[exchangeId]/bare-vp', BARE_POST, BARE_OPTIONS]
])('%s', (_route, post, options) => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindFirst.mockResolvedValue(EXCHANGE);
		mockUpdate.mockResolvedValue({});
		mockUpdateMany.mockResolvedValue({ count: 1 });
		mockClaimFindUnique.mockResolvedValue({
			id: 'claim-1',
			organizationId: 'org-1',
			userId: 'user-1',
			achievementId: 'ach-1',
			claimStatus: ClaimStatus.ACCEPTED,
			achievement: { id: 'ach-1' },
			user: { id: 'user-1', identifiers: [] }
		});
		mockIsSuspended.mockResolvedValue(false);
		mockVerify.mockResolvedValue({ holderDid: HOLDER, presentation: VP });
		mockToCredential.mockResolvedValue(SIGNED_VC);
		mockCredentialCreate.mockResolvedValue({});
	});

	it('OPTIONS returns 204 with CORS headers', async () => {
		const res = (await options({})) as Response;
		expect(res.status).toBe(204);
		expectWalletHeaders(res);
	});

	it('serves the DID-auth request for an empty body and for {}', async () => {
		for (const body of [undefined, '{}']) {
			const res = await call(post, body);
			expect(res.status).toBe(200);
			expectWalletHeaders(res);
			expect(await res.json()).toEqual({
				verifiablePresentationRequest: buildDidAuthVpr(ORG, EXCHANGE)
			});
		}
		expect(mockFindFirst).toHaveBeenCalledWith({
			where: { id: 'ex-1', organizationId: 'org-1' }
		});
	});

	it('404 with CORS headers for an unknown exchange', async () => {
		mockFindFirst.mockResolvedValue(null);
		const res = await call(post, '{}', 'nope');
		expect(res.status).toBe(404);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({ error: 'not_found' });
	});

	it('410 with CORS headers for a closed exchange', async () => {
		mockFindFirst.mockResolvedValue({ ...EXCHANGE, completedAt: new Date() });
		const res = await call(post, JSON.stringify(VP));
		expect(res.status).toBe(410);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({ error: 'exchange_closed' });
	});

	it('400 with CORS headers when DID auth fails', async () => {
		mockVerify.mockRejectedValue(new DidAuthError('invalid_signature', 'Signature is invalid.'));
		const res = await call(post, JSON.stringify(VP));
		expect(res.status).toBe(400);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({
			error: 'invalid_signature',
			message: 'Signature is invalid.'
		});
	});

	it('400 with CORS headers for invalid JSON', async () => {
		const res = await call(post, '{oops');
		expect(res.status).toBe(400);
		expectWalletHeaders(res);
		expect(mockFindFirst).not.toHaveBeenCalled();
	});

	it('413 with CORS headers for an oversize body', async () => {
		const res = await call(post, JSON.stringify({ pad: 'x'.repeat(70 * 1024) }));
		expect(res.status).toBe(413);
		expectWalletHeaders(res);
		expect(mockFindFirst).not.toHaveBeenCalled();
	});

	it('503 with CORS headers when the issuer is misconfigured', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockToCredential.mockRejectedValue(new IssuerMisconfiguredError('no key'));
		const res = await call(post, JSON.stringify(VP));
		expect(res.status).toBe(503);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({ error: 'issuance_failed' });
		spy.mockRestore();
	});

	it('500 with CORS headers on an unexpected throw', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockFindFirst.mockRejectedValue(new Error('connection reset'));
		const res = await call(post, '{}');
		expect(res.status).toBe(500);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({ error: 'server_error' });
		spy.mockRestore();
	});
});

describe('response envelope', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindFirst.mockResolvedValue(EXCHANGE);
		mockUpdateMany.mockResolvedValue({ count: 1 });
		mockClaimFindUnique.mockResolvedValue({
			id: 'claim-1',
			organizationId: 'org-1',
			userId: 'user-1',
			achievementId: 'ach-1',
			claimStatus: ClaimStatus.ACCEPTED,
			achievement: { id: 'ach-1' },
			user: { id: 'user-1', identifiers: [] }
		});
		mockIsSuspended.mockResolvedValue(false);
		mockVerify.mockResolvedValue({ holderDid: HOLDER, presentation: VP });
		mockToCredential.mockResolvedValue(SIGNED_VC);
		mockCredentialCreate.mockResolvedValue({});
	});

	it('the VC-API route wraps the VP in { verifiablePresentation }', async () => {
		const res = await call(POST, JSON.stringify({ verifiablePresentation: VP }));
		expect(res.status).toBe(200);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({ verifiablePresentation: PRESENTATION });
	});

	it('/bare-vp accepts a bare VP and returns the bare VP', async () => {
		const res = await call(BARE_POST, JSON.stringify(VP));
		expect(res.status).toBe(200);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual(PRESENTATION);
		expect(mockVerify).toHaveBeenCalledWith(expect.objectContaining({ body: VP }));
	});

	it('/bare-vp also accepts a wrapped VP and still returns the bare VP', async () => {
		const res = await call(BARE_POST, JSON.stringify({ verifiablePresentation: VP }));
		expect(await res.json()).toEqual(PRESENTATION);
	});
});
