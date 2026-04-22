import * as m from '$lib/i18n/messages';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaimStatus } from '@prisma/client';

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
		mockIsExchangeEnabled.mockReturnValue(true);
		mockFindUnique.mockResolvedValue(buildClaim());
		mockCreateExchange.mockResolvedValue({
			exchangeId: 'ex-1',
			protocols: {
				iu: 'https://iu.example',
				vcapi: 'https://v',
				lcw: 'https://l',
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
		expect(body.exchangeId).toBe('ex-1');
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
