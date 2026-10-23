import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as m from '$lib/i18n/messages';
import { BadOrgConfigBlobError } from '$lib/server/secrets/orgConfigCrypto';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';
import { TransactionServiceUpstreamError } from '$lib/server/transactionService/client';

const mockGetExchangeState = vi.hoisted(() => vi.fn());
const mockClaimFindUnique = vi.hoisted(() => vi.fn());
const mockExchangeFindFirst = vi.hoisted(() => vi.fn());
const mockIsSuspended = vi.hoisted(() => vi.fn().mockResolvedValue(false));

vi.mock('$lib/server/transactionService/client', async (importOriginal) => {
	const mod = await importOriginal<typeof import('$lib/server/transactionService/client')>();
	return { ...mod, getExchangeState: mockGetExchangeState };
});

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievementClaim: { findUnique: mockClaimFindUnique },
		credentialExchange: { findFirst: mockExchangeFindFirst }
	}
}));

vi.mock('$lib/server/moderation/suspension', () => ({ isSuspended: mockIsSuspended }));

import { GET } from './+server';

const TXN_ORG: App.Organization = {
	id: 'org-1',
	name: 'Test Org',
	email: 'org@test.com',
	domain: 'example.com',
	description: 'desc',
	json: { issuer: { type: 'transactionService' } }
} as App.Organization;

const LOCAL_ORG: App.Organization = { ...TXN_ORG, json: {} } as App.Organization;

const EXPIRES = new Date('2099-01-01T00:00:00.000Z');
const T = new Date('2026-10-12T00:00:00.000Z');

function buildClaim(over: Record<string, unknown> = {}) {
	return {
		id: 'claim-1',
		organizationId: 'org-1',
		userId: 'user-1',
		achievementId: 'ach-1',
		...over
	};
}

function buildExchange(over: Record<string, unknown> = {}) {
	return {
		id: 'ex-1',
		organizationId: 'org-1',
		claimId: 'claim-1',
		challenge: 'secret-challenge',
		expiresAt: EXPIRES,
		startedAt: null,
		completedAt: null,
		errors: null,
		createdAt: T,
		...over
	};
}

function makeEvent(
	over: {
		locals?: Partial<{ session: App.SessionData | null | undefined; org: App.Organization }>;
		params?: Partial<{ claimId: string; exchangeId: string }>;
	} = {}
) {
	return {
		locals: {
			org: LOCAL_ORG,
			session: { user: { id: 'user-1' } } as App.SessionData,
			...over.locals
		},
		params: { claimId: 'claim-1', exchangeId: 'ex-1', ...over.params }
	} as Parameters<typeof GET>[0];
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

async function expectKitError(p: Promise<unknown>, status: number, message?: string) {
	try {
		await p;
		expect.fail('expected throw');
	} catch (e) {
		expect(isKitError(e)).toBe(true);
		if (isKitError(e)) {
			expect(e.status).toBe(status);
			if (message !== undefined) expect(e.body.message).toBe(message);
		}
	}
}

describe('GET /claims/[claimId]/exchange/[exchangeId]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsSuspended.mockResolvedValue(false);
		mockClaimFindUnique.mockResolvedValue(buildClaim());
		mockExchangeFindFirst.mockResolvedValue(buildExchange());
		mockGetExchangeState.mockResolvedValue({
			state: 'active',
			expiresAt: '2099-01-01T00:00:00.000Z'
		});
	});

	describe('owner checks', () => {
		it('returns 404 when there is no session, without looking up the claim', async () => {
			await expectKitError(
				GET(makeEvent({ locals: { session: null } })),
				404,
				m.best_sharp_lamb_enchant()
			);
			expect(mockClaimFindUnique).not.toHaveBeenCalled();
		});

		it('returns 404 when the claim is not found', async () => {
			mockClaimFindUnique.mockResolvedValue(null);
			await expectKitError(GET(makeEvent()), 404, m.best_sharp_lamb_enchant());
			expect(mockExchangeFindFirst).not.toHaveBeenCalled();
		});

		it('returns 404 when the signed-in user does not own the claim', async () => {
			mockClaimFindUnique.mockResolvedValue(buildClaim({ userId: 'other-user' }));
			await expectKitError(GET(makeEvent()), 404, m.best_sharp_lamb_enchant());
			expect(mockExchangeFindFirst).not.toHaveBeenCalled();
		});

		it('returns 404 when the claim belongs to another org', async () => {
			mockClaimFindUnique.mockResolvedValue(buildClaim({ organizationId: 'other-org' }));
			await expectKitError(GET(makeEvent()), 404, m.best_sharp_lamb_enchant());
			expect(mockExchangeFindFirst).not.toHaveBeenCalled();
			expect(mockGetExchangeState).not.toHaveBeenCalled();
		});

		it('returns 403 when the claim is suspended', async () => {
			mockIsSuspended.mockImplementation(async ({ targetType }) => targetType === 'CLAIM');
			await expectKitError(GET(makeEvent()), 403, m.glum_stout_seal_block());
			expect(mockExchangeFindFirst).not.toHaveBeenCalled();
		});

		it('returns 403 when the achievement is suspended', async () => {
			mockIsSuspended.mockImplementation(
				async ({ targetType, targetId }) => targetType === 'ACHIEVEMENT' && targetId === 'ach-1'
			);
			await expectKitError(GET(makeEvent()), 403, m.glum_stout_seal_block());
			expect(mockExchangeFindFirst).not.toHaveBeenCalled();
		});
	});

	describe('local signing', () => {
		it('scopes the lookup by exchange id, org and claim', async () => {
			await GET(makeEvent());
			expect(mockExchangeFindFirst).toHaveBeenCalledWith({
				where: { id: 'ex-1', organizationId: 'org-1', claimId: 'claim-1' }
			});
			expect(mockGetExchangeState).not.toHaveBeenCalled();
		});

		it('returns pending with expiresAt and no errors key for a fresh exchange', async () => {
			const res = await GET(makeEvent());
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body).toEqual({ state: 'pending', expiresAt: '2099-01-01T00:00:00.000Z' });
			expect('errors' in body).toBe(false);
		});

		it('returns active once the wallet has started', async () => {
			mockExchangeFindFirst.mockResolvedValue(buildExchange({ startedAt: T }));
			const body = await (await GET(makeEvent())).json();
			expect(body.state).toBe('active');
		});

		it('returns complete once completed', async () => {
			mockExchangeFindFirst.mockResolvedValue(buildExchange({ startedAt: T, completedAt: T }));
			const body = await (await GET(makeEvent())).json();
			expect(body).toEqual({ state: 'complete', expiresAt: '2099-01-01T00:00:00.000Z' });
		});

		it('omits errors when the stored errors array is empty', async () => {
			mockExchangeFindFirst.mockResolvedValue(buildExchange({ startedAt: T, errors: [] }));
			const body = await (await GET(makeEvent())).json();
			expect(body).toEqual({ state: 'active', expiresAt: '2099-01-01T00:00:00.000Z' });
		});

		it('returns invalid with errors mapped to code and message only', async () => {
			mockExchangeFindFirst.mockResolvedValue(
				buildExchange({
					startedAt: T,
					errors: [
						{
							code: 'proof_invalid',
							message: 'The presentation proof did not verify.',
							at: '2026-10-12T00:00:01.000Z',
							detail: 'internal'
						},
						{ code: 'expired', message: 'Exchange expired.', at: '2026-10-12T00:00:02.000Z' }
					]
				})
			);
			const body = await (await GET(makeEvent())).json();
			expect(body).toEqual({
				state: 'invalid',
				expiresAt: '2099-01-01T00:00:00.000Z',
				errors: [
					{ code: 'proof_invalid', message: 'The presentation proof did not verify.' },
					{ code: 'expired', message: 'Exchange expired.' }
				]
			});
		});

		it('does not leak other row fields such as the challenge', async () => {
			const res = await GET(makeEvent());
			const text = await res.text();
			expect(text).not.toContain('secret-challenge');
			expect(Object.keys(JSON.parse(text)).sort()).toEqual(['expiresAt', 'state']);
		});

		it("returns 404 when the exchange isn't found for this org and claim", async () => {
			mockExchangeFindFirst.mockResolvedValue(null);
			await expectKitError(
				GET(makeEvent({ params: { exchangeId: 'another-claims-exchange' } })),
				404,
				m.best_sharp_lamb_enchant()
			);
			expect(mockExchangeFindFirst).toHaveBeenCalledWith({
				where: { id: 'another-claims-exchange', organizationId: 'org-1', claimId: 'claim-1' }
			});
		});

		it('sets Cache-Control: no-store', async () => {
			const res = await GET(makeEvent());
			expect(res.headers.get('Cache-Control')).toBe('no-store');
		});
	});

	describe('transaction service', () => {
		const txnEvent = () => makeEvent({ locals: { org: TXN_ORG } });

		it('calls getExchangeState with the org and exchange id and skips the local table', async () => {
			await GET(txnEvent());
			expect(mockGetExchangeState).toHaveBeenCalledWith(TXN_ORG, 'ex-1');
			expect(mockExchangeFindFirst).not.toHaveBeenCalled();
		});

		it('returns only state and expiresAt', async () => {
			mockGetExchangeState.mockResolvedValue({
				state: 'complete',
				expiresAt: '2099-01-01T00:00:00.000Z',
				variables: { vc: '{"credentialSubject":{"name":"Secret Name"}}' },
				vc: { credentialSubject: { name: 'Secret Name' } }
			});
			const res = await GET(txnEvent());
			expect(res.status).toBe(200);
			const text = await res.text();
			expect(JSON.parse(text)).toEqual({
				state: 'complete',
				expiresAt: '2099-01-01T00:00:00.000Z'
			});
			expect(text).not.toContain('Secret Name');
		});

		it('passes a null expiresAt through', async () => {
			mockGetExchangeState.mockResolvedValue({ state: 'pending', expiresAt: null });
			const body = await (await GET(txnEvent())).json();
			expect(body).toEqual({ state: 'pending', expiresAt: null });
		});

		it('sets Cache-Control: no-store', async () => {
			const res = await GET(txnEvent());
			expect(res.headers.get('Cache-Control')).toBe('no-store');
		});

		it('returns 404 when the transaction service has no such exchange', async () => {
			mockGetExchangeState.mockResolvedValue(null);
			await expectKitError(GET(txnEvent()), 404, m.best_sharp_lamb_enchant());
		});

		it('returns 502 when the transaction service fails', async () => {
			mockGetExchangeState.mockRejectedValue(
				new TransactionServiceUpstreamError('upstream', { status: 500 })
			);
			await expectKitError(GET(txnEvent()), 502, "We couldn't reach the issuer service.");
		});

		it('returns 503 when the issuer is misconfigured', async () => {
			mockGetExchangeState.mockRejectedValue(new IssuerMisconfiguredError('no config'));
			await expectKitError(GET(txnEvent()), 503, 'Issuer is misconfigured.');
		});

		it('returns 503 when the org config blob cannot be decrypted', async () => {
			mockGetExchangeState.mockRejectedValue(new BadOrgConfigBlobError('bad'));
			await expectKitError(GET(txnEvent()), 503, 'Issuer is misconfigured.');
		});

		it('rethrows unexpected errors', async () => {
			const boom = new Error('boom');
			mockGetExchangeState.mockRejectedValue(boom);
			await expect(GET(txnEvent())).rejects.toBe(boom);
		});

		it('still applies the owner check before calling the service', async () => {
			mockClaimFindUnique.mockResolvedValue(buildClaim({ userId: 'other-user' }));
			await expectKitError(GET(txnEvent()), 404);
			expect(mockGetExchangeState).not.toHaveBeenCalled();
		});
	});
});
