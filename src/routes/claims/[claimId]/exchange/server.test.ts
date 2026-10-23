import { ClaimStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as m from '$lib/i18n/messages';
import { BadOrgConfigBlobError } from '$lib/server/secrets/orgConfigCrypto';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';
import { TransactionServiceUpstreamError } from '$lib/server/transactionService/client';

const mockCreateExchange = vi.hoisted(() => vi.fn());
const mockIsExchangeEnabled = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/transactionService/client', async (importOriginal) => {
	const mod = await importOriginal<typeof import('$lib/server/transactionService/client')>();
	return { ...mod, createExchange: mockCreateExchange };
});

vi.mock('$lib/server/transactionService/config', () => ({
	isExchangeEnabled: mockIsExchangeEnabled
}));

vi.mock('$lib/../prisma/client', () => ({
	prisma: { achievementClaim: { findUnique: mockFindUnique } }
}));

// P5: the exchange path now blocks suspended content; default to "not suspended".
const mockIsSuspended = vi.hoisted(() => vi.fn().mockResolvedValue(false));
vi.mock('$lib/server/moderation/suspension', () => ({ isSuspended: mockIsSuspended }));

// Local-signing orgs host the exchange themselves (P4 of chapi-exchange-delivery).
const mockResolveActiveSigningKey = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/signingKey/resolver', async (importOriginal) => {
	const mod = await importOriginal<typeof import('$lib/server/signingKey/resolver')>();
	return { ...mod, resolveActiveSigningKey: mockResolveActiveSigningKey };
});

const mockCreateLocalExchange = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/exchange/localExchange', () => ({
	createLocalExchange: mockCreateLocalExchange
}));

import { POST } from './+server';

const ORG: App.Organization = {
	id: 'org-1',
	name: 'Test Org',
	email: 'org@test.com',
	domain: 'example.com',
	description: 'desc',
	json: { issuer: { type: 'transactionService' } }
} as App.Organization;

function buildClaim(over: Record<string, unknown> = {}) {
	return {
		id: 'claim-1',
		organizationId: 'org-1',
		userId: 'user-1',
		claimStatus: ClaimStatus.ACCEPTED,
		validFrom: new Date('2020-01-01'),
		achievement: {
			id: 'ach-1',
			name: 'Test Achievement',
			description: 'desc',
			criteriaNarrative: 'crit'
		},
		user: { id: 'user-1', identifiers: [] },
		...over
	};
}

function makeEvent(
	over: {
		locals?: Partial<{ session: App.SessionData | null | undefined; org: App.Organization }>;
		params?: { claimId: string };
	} = {}
) {
	return {
		locals: { org: ORG, session: { user: { id: 'user-1' } } as App.SessionData, ...over.locals },
		params: { claimId: 'claim-1', ...over.params }
	} as Parameters<typeof POST>[0];
}

function isKitError(e: unknown): e is { status: number; body: { message: string } } {
	return (
		typeof e === 'object' &&
		e !== null &&
		'status' in e &&
		'body' in e &&
		typeof (e as { body: unknown }).body === 'object' &&
		(e as { body: { message?: string } }).body !== null
	);
}

describe('POST /claims/[claimId]/exchange', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsSuspended.mockResolvedValue(false);
		mockIsExchangeEnabled.mockReturnValue(true);
		mockFindUnique.mockResolvedValue(buildClaim());
		mockCreateExchange.mockResolvedValue({
			exchangeId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
			protocols: {
				iu: 'https://host.example/interactions/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
				vcapi:
					'https://host.example/workflows/claim/exchanges/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
				lcw: 'https://lcw.app/request?vcapi=...',
				verifiablePresentationRequest: {}
			},
			expiresAt: '2099-01-01T00:00:00.000Z'
		});
	});

	it('returns 404 when there is no session', async () => {
		const ev = makeEvent({ locals: { session: null } });
		try {
			await POST(ev);
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(404);
				expect(e.body.message).toBe(m.best_sharp_lamb_enchant());
			}
		}
		expect(mockFindUnique).not.toHaveBeenCalled();
	});

	it('returns 409 when isExchangeEnabled is false and does not look up the claim', async () => {
		mockIsExchangeEnabled.mockReturnValue(false);
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(409);
				expect(e.body.message).toBe('This organization is not configured for wallet exchange.');
			}
		}
		expect(mockFindUnique).not.toHaveBeenCalled();
	});

	it('returns 404 when the claim is not found', async () => {
		mockFindUnique.mockResolvedValue(null);
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(404);
				expect(e.body.message).toBe(m.best_sharp_lamb_enchant());
			}
		}
	});

	it('returns 404 when the claim belongs to a different org', async () => {
		mockFindUnique.mockResolvedValue(
			buildClaim({
				organizationId: 'other-org',
				userId: 'user-1',
				claimStatus: ClaimStatus.ACCEPTED
			})
		);
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(404);
			}
		}
	});

	it('returns 404 when the claim belongs to a different user', async () => {
		mockFindUnique.mockResolvedValue(
			buildClaim({
				userId: 'other-user',
				organizationId: 'org-1',
				claimStatus: ClaimStatus.ACCEPTED
			})
		);
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(404);
			}
		}
	});

	it('returns 404 when the claim is not ACCEPTED', async () => {
		mockFindUnique.mockResolvedValue(
			buildClaim({ claimStatus: ClaimStatus.UNACCEPTED, organizationId: 'org-1', userId: 'user-1' })
		);
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(404);
			}
		}
	});

	it('returns JSON and omits credentialSubject.id on the vc passed to createExchange', async () => {
		const res = (await POST(makeEvent())) as Response;
		expect(res.ok).toBe(true);
		const body = (await res.json()) as { exchangeId: string; protocols: { iu: string } };
		expect(body.exchangeId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
		expect(mockCreateExchange).toHaveBeenCalledTimes(1);
		const vcArg = mockCreateExchange.mock.calls[0][1].vc as {
			credentialSubject: Record<string, unknown>;
		};
		expect('id' in vcArg.credentialSubject).toBe(false);
	});

	it('returns 409 when createExchange throws IssuerMisconfiguredError', async () => {
		mockCreateExchange.mockRejectedValue(new IssuerMisconfiguredError('no key'));
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(409);
				expect(e.body.message).toBe('Issuer is misconfigured.');
			}
		}
	});

	it('returns 503 when createExchange throws BadOrgConfigBlobError', async () => {
		mockCreateExchange.mockRejectedValue(new BadOrgConfigBlobError('bad'));
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(503);
				expect(e.body.message).toBe('Issuer is misconfigured.');
			}
		}
	});

	it('returns 502 when createExchange throws TransactionServiceUpstreamError', async () => {
		mockCreateExchange.mockRejectedValue(
			new TransactionServiceUpstreamError('upstream', { status: 502 })
		);
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(502);
				expect(e.body.message).toBe("We couldn't reach the issuer service.");
			}
		}
	});

	it('returns 500 when createExchange throws a generic Error', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockCreateExchange.mockRejectedValue(new Error('nope'));
		try {
			await POST(makeEvent());
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(500);
				expect(e.body.message).toBe('Unexpected error.');
			}
		}
		spy.mockRestore();
	});
});

describe('POST /claims/[claimId]/exchange (local-signing org)', () => {
	const LOCAL_ORG = {
		...ORG,
		json: { issuer: { type: 'signingKey', signingKeyId: 'key-1' } }
	} as App.Organization;

	const LOCAL_RESPONSE = {
		exchangeId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
		protocols: {
			iu: 'https://example.com/interactions/b2c3d4e5-f6a7-8901-bcde-f12345678901?iuv=1',
			vcapi: 'https://example.com/workflows/claim/exchanges/b2c3d4e5-f6a7-8901-bcde-f12345678901',
			lcw: 'https://lcw.app/request.html?issuer=example.com&auth_type=bearer&challenge=c&vc_request_url=x',
			verifiablePresentationRequest: { query: { type: 'DIDAuthentication' } }
		},
		expiresAt: '2099-01-01T00:00:00.000Z'
	};

	function localEvent(
		over: { session?: App.SessionData | null; org?: App.Organization } = {}
	): Parameters<typeof POST>[0] {
		return makeEvent({
			locals: {
				org: over.org ?? LOCAL_ORG,
				session:
					over.session === undefined
						? ({ user: { id: 'user-1' } } as App.SessionData)
						: over.session
			}
		});
	}

	async function expectKitError(promise: Promise<unknown>, status: number, message?: string) {
		try {
			await promise;
			expect.fail('expected throw');
		} catch (e) {
			expect(isKitError(e)).toBe(true);
			if (isKitError(e)) {
				expect(e.status).toBe(status);
				if (message !== undefined) expect(e.body.message).toBe(message);
			}
		}
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockIsSuspended.mockResolvedValue(false);
		// isExchangeEnabled means "transaction service configured"; a local org has none.
		mockIsExchangeEnabled.mockReturnValue(false);
		mockFindUnique.mockResolvedValue(buildClaim());
		mockResolveActiveSigningKey.mockResolvedValue({ id: 'key-1' });
		mockCreateLocalExchange.mockResolvedValue(LOCAL_RESPONSE);
	});

	it.each([
		['a signingKey issuer', LOCAL_ORG],
		['no issuer config', { ...ORG, json: {} } as App.Organization]
	])('returns createLocalExchange’s shape for an org with %s', async (_label, org) => {
		const res = (await POST(localEvent({ org }))) as Response;
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(LOCAL_RESPONSE);
		expect(mockResolveActiveSigningKey).toHaveBeenCalledWith(org);
		expect(mockCreateLocalExchange).toHaveBeenCalledWith(org, 'claim-1');
		expect(mockResolveActiveSigningKey.mock.invocationCallOrder[0]).toBeLessThan(
			mockCreateLocalExchange.mock.invocationCallOrder[0]
		);
		expect(mockCreateExchange).not.toHaveBeenCalled();
	});

	it.each([
		['IssuerMisconfiguredError', new IssuerMisconfiguredError('key revoked')],
		['a missing key (Prisma not-found)', new Error('No SigningKey found')]
	])('returns 503 and creates no exchange when the signing key throws %s', async (_l, err) => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockResolveActiveSigningKey.mockRejectedValue(err);
		await expectKitError(POST(localEvent()), 503, 'Issuer is misconfigured.');
		expect(mockCreateLocalExchange).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it('returns 404 with no session', async () => {
		await expectKitError(POST(localEvent({ session: null })), 404, m.best_sharp_lamb_enchant());
		expect(mockCreateLocalExchange).not.toHaveBeenCalled();
	});

	it.each([
		['missing', null],
		['in another org', buildClaim({ organizationId: 'other-org' })],
		['owned by another user', buildClaim({ userId: 'other-user' })],
		['not ACCEPTED', buildClaim({ claimStatus: ClaimStatus.UNACCEPTED })]
	])('returns 404 when the claim is %s', async (_label, claim) => {
		mockFindUnique.mockResolvedValue(claim);
		await expectKitError(POST(localEvent()), 404, m.best_sharp_lamb_enchant());
		expect(mockResolveActiveSigningKey).not.toHaveBeenCalled();
		expect(mockCreateLocalExchange).not.toHaveBeenCalled();
	});

	it.each([['CLAIM'], ['ACHIEVEMENT']])('returns 403 when the %s is suspended', async (type) => {
		mockIsSuspended.mockImplementation(async ({ targetType }) => targetType === type);
		await expectKitError(POST(localEvent()), 403, m.glum_stout_seal_block());
		expect(mockCreateLocalExchange).not.toHaveBeenCalled();
	});
});
