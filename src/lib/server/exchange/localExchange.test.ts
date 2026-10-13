import { ClaimStatus, Prisma, type CredentialExchange } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

import { EXCHANGE_TTL_MS } from './constants';
import { DidAuthError } from './didAuth';
import { createLocalExchange, findExchange, isClosed, participate } from './localExchange';
import { buildDidAuthVpr, buildLocalProtocols } from './protocols';

vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

const mockExchangeCreate = vi.hoisted(() => vi.fn());
const mockExchangeFindFirst = vi.hoisted(() => vi.fn());
const mockExchangeUpdate = vi.hoisted(() => vi.fn());
const mockExchangeUpdateMany = vi.hoisted(() => vi.fn());
const mockClaimFindUnique = vi.hoisted(() => vi.fn());
const mockClaimUpdate = vi.hoisted(() => vi.fn());
const mockCredentialCreate = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		credentialExchange: {
			create: mockExchangeCreate,
			findFirst: mockExchangeFindFirst,
			update: mockExchangeUpdate,
			updateMany: mockExchangeUpdateMany
		},
		achievementClaim: { findUnique: mockClaimFindUnique, update: mockClaimUpdate },
		achievementCredential: { create: mockCredentialCreate }
	}
}));

const mockIsSuspended = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/moderation/suspension', () => ({ isSuspended: mockIsSuspended }));

const mockVerify = vi.hoisted(() => vi.fn());
vi.mock('./didAuth', async (importOriginal) => {
	const mod = await importOriginal<typeof import('./didAuth')>();
	return { ...mod, verifyDidAuthPresentation: mockVerify };
});

const mockToCredential = vi.hoisted(() => vi.fn());
vi.mock('$lib/credentials/achievementCredential', () => ({
	achievementClaimToCredential: mockToCredential
}));

const NOW = new Date('2026-10-12T12:00:00.000Z');
const HOLDER = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';

const ORG = {
	id: 'org-1',
	name: 'Test Org',
	email: 'org@test.com',
	domain: 'badgistan.orcapods.org',
	description: 'desc',
	json: { issuer: { type: 'signingKey', signingKeyId: 'key-1' } }
} as App.Organization;

function buildExchange(over: Partial<CredentialExchange> = {}): CredentialExchange {
	return {
		id: 'ex-1',
		organizationId: 'org-1',
		claimId: 'claim-1',
		challenge: 'challenge-abc',
		expiresAt: new Date(NOW.getTime() + 10 * 60 * 1000),
		startedAt: null,
		completedAt: null,
		errors: null,
		createdAt: new Date(NOW.getTime() - 60 * 1000),
		...over
	};
}

function buildClaim(over: Record<string, unknown> = {}) {
	return {
		id: 'claim-1',
		organizationId: 'org-1',
		userId: 'user-1',
		achievementId: 'ach-1',
		credentialId: 'existing-credential',
		claimStatus: ClaimStatus.ACCEPTED,
		achievement: { id: 'ach-1', name: 'Test Achievement' },
		user: { id: 'user-1', identifiers: [] },
		...over
	};
}

const SIGNED_VC = {
	'@context': ['https://www.w3.org/ns/credentials/v2'],
	id: 'urn:uuid:11111111-2222-4333-8444-555555555555',
	type: ['VerifiableCredential', 'OpenBadgeCredential'],
	credentialSubject: { id: HOLDER },
	proof: { type: 'DataIntegrityProof' }
};

const VP_BODY = {
	verifiablePresentation: { type: ['VerifiablePresentation'], holder: HOLDER, proof: {} }
};

/**
 * A release is ONE write that appends the error and clears `completedAt` together, so the
 * exchange never looks open in between.
 */
function expectSingleReleaseWrite(code: string, message: string) {
	expect(mockExchangeUpdate).toHaveBeenCalledTimes(1);
	expect(mockExchangeUpdate).toHaveBeenCalledWith({
		where: { id: 'ex-1' },
		data: { errors: [{ code, message, at: NOW.toISOString() }], completedAt: null }
	});
}

describe('localExchange', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
		mockExchangeFindFirst.mockResolvedValue(buildExchange());
		mockExchangeUpdate.mockResolvedValue({});
		mockExchangeUpdateMany.mockResolvedValue({ count: 1 });
		mockClaimFindUnique.mockResolvedValue(buildClaim());
		mockIsSuspended.mockResolvedValue(false);
		mockVerify.mockResolvedValue({ holderDid: HOLDER, presentation: {} });
		mockToCredential.mockResolvedValue(SIGNED_VC);
		mockCredentialCreate.mockResolvedValue({ id: 'cred-row-1' });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('createLocalExchange', () => {
		it('stores a random base64url challenge and a 15-minute expiry, and returns the protocols', async () => {
			mockExchangeCreate.mockImplementation(async ({ data }) => ({
				...buildExchange({ challenge: data.challenge, expiresAt: data.expiresAt }),
				id: 'ex-new'
			}));

			const result = await createLocalExchange(ORG, 'claim-1');

			const { data } = mockExchangeCreate.mock.calls[0][0];
			expect(data.organization).toEqual({ connect: { id: 'org-1' } });
			expect(data.claim).toEqual({ connect: { id: 'claim-1' } });
			// 32 random bytes → 43 base64url characters.
			expect(data.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
			expect(data.expiresAt).toEqual(new Date(NOW.getTime() + EXCHANGE_TTL_MS));

			expect(result).toEqual({
				exchangeId: 'ex-new',
				protocols: buildLocalProtocols(ORG, { id: 'ex-new', challenge: data.challenge }),
				expiresAt: new Date(NOW.getTime() + EXCHANGE_TTL_MS).toISOString()
			});
		});

		it('uses a fresh challenge for each exchange', async () => {
			mockExchangeCreate.mockImplementation(async ({ data }) => buildExchange(data));
			await createLocalExchange(ORG, 'claim-1');
			await createLocalExchange(ORG, 'claim-1');
			const [a, b] = mockExchangeCreate.mock.calls.map(([arg]) => arg.data.challenge);
			expect(a).not.toBe(b);
		});
	});

	describe('findExchange', () => {
		it('scopes the lookup to the org', async () => {
			await findExchange(ORG, 'ex-1');
			expect(mockExchangeFindFirst).toHaveBeenCalledWith({
				where: { id: 'ex-1', organizationId: 'org-1' }
			});
		});
	});

	describe('isClosed', () => {
		it('is open while pending', () => {
			expect(isClosed(buildExchange())).toBe(false);
		});
		it('is closed when completed, invalid or expired', () => {
			expect(isClosed(buildExchange({ completedAt: NOW }))).toBe(true);
			expect(isClosed(buildExchange({ errors: [{ code: 'x', message: 'y', at: 'z' }] }))).toBe(
				true
			);
			expect(isClosed(buildExchange({ expiresAt: NOW }))).toBe(true);
		});
	});

	describe('participate', () => {
		it.each([
			[{}],
			[[]],
			[null],
			[{ unrelated: true }],
			[{ type: 'x' }],
			[{ type: ['VerifiableCredential'] }]
		])(
			'serves the DID-auth request for a body without a presentation (%j) and sets startedAt',
			async (body) => {
				const res = await participate(ORG, 'ex-1', body, { bareVp: false });

				expect(res).toEqual({
					status: 200,
					body: { verifiablePresentationRequest: buildDidAuthVpr(ORG, buildExchange()) }
				});
				expect(mockExchangeUpdateMany).toHaveBeenCalledWith({
					where: { id: 'ex-1', startedAt: null },
					data: { startedAt: NOW }
				});
				expect(mockVerify).not.toHaveBeenCalled();
			}
		);

		it('serves the VPR for { type: "x" } and records no error', async () => {
			const res = await participate(ORG, 'ex-1', { type: 'x' }, { bareVp: false });
			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty('verifiablePresentationRequest');
			expect(mockVerify).not.toHaveBeenCalled();
			expect(mockExchangeUpdate).not.toHaveBeenCalled();
		});

		it.each([
			['a bare VP with type array', { type: ['VerifiablePresentation'] }],
			['a bare VP with type string', { type: 'VerifiablePresentation' }],
			['a body with a proof', { proof: {} }],
			['a wrapped VP', { verifiablePresentation: {} }]
		])('treats %s as a presentation and verifies it', async (_label, body) => {
			const res = await participate(ORG, 'ex-1', body, { bareVp: false });
			expect(mockVerify).toHaveBeenCalledWith(expect.objectContaining({ body }));
			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty('verifiablePresentation');
		});

		it('does not rewrite startedAt when the request was already served', async () => {
			mockExchangeFindFirst.mockResolvedValue(
				buildExchange({ startedAt: new Date(NOW.getTime() - 1000) })
			);
			const res = await participate(ORG, 'ex-1', {}, { bareVp: false });
			expect(res.status).toBe(200);
			expect(mockExchangeUpdateMany).not.toHaveBeenCalled();
		});

		it('returns 404 for an unknown id or another org’s exchange, with an org-scoped lookup', async () => {
			mockExchangeFindFirst.mockResolvedValue(null);
			const res = await participate(ORG, 'ex-other-org', VP_BODY, { bareVp: false });
			expect(res).toEqual({ status: 404, body: { error: 'not_found' } });
			expect(mockExchangeFindFirst).toHaveBeenCalledWith({
				where: { id: 'ex-other-org', organizationId: 'org-1' }
			});
			expect(mockExchangeUpdate).not.toHaveBeenCalled();
			expect(mockExchangeUpdateMany).not.toHaveBeenCalled();
		});

		it.each([
			['expired', { expiresAt: new Date(NOW.getTime() - 1) }],
			['expiring exactly now', { expiresAt: NOW }],
			['completed', { completedAt: new Date(NOW.getTime() - 1000) }],
			['invalid', { errors: [{ code: 'invalid_signature', message: 'bad', at: 'then' }] }]
		])('returns 410 when the exchange is %s, for both request kinds', async (_label, over) => {
			mockExchangeFindFirst.mockResolvedValue(buildExchange(over));
			for (const body of [{}, VP_BODY]) {
				expect(await participate(ORG, 'ex-1', body, { bareVp: false })).toEqual({
					status: 410,
					body: { error: 'exchange_closed' }
				});
			}
			expect(mockVerify).not.toHaveBeenCalled();
			expect(mockExchangeUpdate).not.toHaveBeenCalled();
			expect(mockExchangeUpdateMany).not.toHaveBeenCalled();
		});

		it('issues a holder-bound credential and stores it against the claim', async () => {
			const res = await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });

			expect(mockVerify).toHaveBeenCalledWith({
				body: VP_BODY,
				challenge: 'challenge-abc',
				domain: 'https://badgistan.orcapods.org'
			});

			// Single-use claim of the exchange before signing.
			expect(mockExchangeUpdateMany).toHaveBeenCalledWith({
				where: {
					id: 'ex-1',
					organizationId: 'org-1',
					completedAt: null,
					errors: { equals: Prisma.AnyNull },
					expiresAt: { gt: NOW }
				},
				data: { completedAt: NOW }
			});
			expect(mockExchangeUpdateMany.mock.invocationCallOrder[0]).toBeLessThan(
				mockToCredential.mock.invocationCallOrder[0]
			);

			const [claimArg, orgArg, options] = mockToCredential.mock.calls[0];
			expect(claimArg).toEqual(buildClaim());
			expect(orgArg).toBe(ORG);
			expect(options.subjectId).toBe(HOLDER);
			expect(options.credentialId).toMatch(
				/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
			);
			expect(options.credentialId).not.toBe('urn:uuid:claim-1');

			expect(mockCredentialCreate).toHaveBeenCalledWith({
				data: {
					organization: { connect: { id: 'org-1' } },
					achievement: { connect: { id: 'ach-1' } },
					creatorUser: { connect: { id: 'user-1' } },
					issuedFor: { connect: { id: 'claim-1' } },
					identifier: SIGNED_VC.id,
					subjectId: HOLDER,
					json: SIGNED_VC
				}
			});

			// The claim's own credential is left alone, and the exchange stays completed.
			expect(mockClaimUpdate).not.toHaveBeenCalled();
			expect(mockExchangeUpdate).not.toHaveBeenCalled();

			expect(res).toEqual({
				status: 200,
				body: {
					verifiablePresentation: {
						'@context': ['https://www.w3.org/ns/credentials/v2'],
						type: ['VerifiablePresentation'],
						verifiableCredential: [SIGNED_VC]
					}
				}
			});
		});

		it('uses a different credential id on every issuance', async () => {
			await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });
			await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });
			const [a, b] = mockToCredential.mock.calls.map(([, , options]) => options.credentialId);
			expect(a).not.toBe(b);
		});

		it('treats a bare VP as a presentation and returns a bare VP when bareVp is set', async () => {
			const bare = VP_BODY.verifiablePresentation;
			const res = await participate(ORG, 'ex-1', bare, { bareVp: true });
			expect(mockVerify).toHaveBeenCalledWith(expect.objectContaining({ body: bare }));
			expect(res).toEqual({
				status: 200,
				body: {
					'@context': ['https://www.w3.org/ns/credentials/v2'],
					type: ['VerifiablePresentation'],
					verifiableCredential: [SIGNED_VC]
				}
			});
		});

		it('returns 410 without signing when a concurrent request already claimed the exchange', async () => {
			mockExchangeUpdateMany.mockResolvedValue({ count: 0 });
			const res = await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });
			expect(res).toEqual({ status: 410, body: { error: 'exchange_closed' } });
			expect(mockClaimFindUnique).not.toHaveBeenCalled();
			expect(mockToCredential).not.toHaveBeenCalled();
			expect(mockCredentialCreate).not.toHaveBeenCalled();
			expect(mockExchangeUpdate).not.toHaveBeenCalled();
		});

		it('returns 400 and appends the error when DID auth fails', async () => {
			mockVerify.mockRejectedValue(
				new DidAuthError('challenge_mismatch', 'Presentation challenge does not match.')
			);
			const res = await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });

			expect(res).toEqual({
				status: 400,
				body: { error: 'challenge_mismatch', message: 'Presentation challenge does not match.' }
			});
			expect(mockExchangeUpdate).toHaveBeenCalledWith({
				where: { id: 'ex-1' },
				data: {
					errors: [
						{
							code: 'challenge_mismatch',
							message: 'Presentation challenge does not match.',
							at: NOW.toISOString()
						}
					]
				}
			});
			// A plain append (not a release): only the errors are written.
			expect(mockExchangeUpdate).toHaveBeenCalledTimes(1);
			expect(mockExchangeUpdate.mock.calls[0][0].data).not.toHaveProperty('completedAt');
			expect(mockExchangeUpdateMany).not.toHaveBeenCalled();
			expect(mockToCredential).not.toHaveBeenCalled();
		});

		it('rethrows unexpected verification errors without recording them', async () => {
			mockVerify.mockRejectedValue(new Error('boom'));
			await expect(participate(ORG, 'ex-1', VP_BODY, { bareVp: false })).rejects.toThrow('boom');
			expect(mockExchangeUpdate).not.toHaveBeenCalled();
		});

		it.each([
			['missing', () => mockClaimFindUnique.mockResolvedValue(null)],
			[
				'no longer ACCEPTED',
				() =>
					mockClaimFindUnique.mockResolvedValue(buildClaim({ claimStatus: ClaimStatus.REJECTED }))
			],
			[
				'in another org',
				() => mockClaimFindUnique.mockResolvedValue(buildClaim({ organizationId: 'org-2' }))
			],
			[
				'suspended',
				() => mockIsSuspended.mockImplementation(async ({ targetType }) => targetType === 'CLAIM')
			],
			[
				'for a suspended achievement',
				() =>
					mockIsSuspended.mockImplementation(async ({ targetType }) => targetType === 'ACHIEVEMENT')
			]
		])(
			'releases the exchange, appends an error and returns 410 when the claim is %s',
			async (_label, arrange) => {
				arrange();
				const res = await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });

				expect(res).toEqual({ status: 410, body: { error: 'exchange_closed' } });
				expectSingleReleaseWrite(
					'claim_unavailable',
					'This badge can no longer be sent to a wallet.'
				);
				expect(mockToCredential).not.toHaveBeenCalled();
				expect(mockCredentialCreate).not.toHaveBeenCalled();
			}
		);

		it('checks suspension against the org and the claim/achievement ids', async () => {
			await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });
			expect(mockIsSuspended).toHaveBeenCalledWith({
				originOrgId: 'org-1',
				targetType: 'CLAIM',
				targetId: 'claim-1'
			});
			expect(mockIsSuspended).toHaveBeenCalledWith({
				originOrgId: 'org-1',
				targetType: 'ACHIEVEMENT',
				targetId: 'ach-1'
			});
		});

		describe('signing failures', () => {
			let consoleSpy: ReturnType<typeof vi.spyOn>;
			beforeEach(() => {
				consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			});
			afterEach(() => {
				consoleSpy.mockRestore();
			});

			function expectReleasedWithIssuanceError() {
				expectSingleReleaseWrite(
					'issuance_failed',
					'The badge could not be issued. Please try again.'
				);
			}

			it('returns 500, releases completedAt and appends an error when signing throws', async () => {
				mockToCredential.mockRejectedValue(new Error('signer exploded: secret detail'));
				const res = await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });

				expect(res).toEqual({ status: 500, body: { error: 'issuance_failed' } });
				expectReleasedWithIssuanceError();
				expect(JSON.stringify(mockExchangeUpdate.mock.calls)).not.toContain('secret detail');
				expect(mockCredentialCreate).not.toHaveBeenCalled();
			});

			it('returns 503 when the issuer is misconfigured', async () => {
				mockToCredential.mockRejectedValue(new IssuerMisconfiguredError('no key'));
				const res = await participate(ORG, 'ex-1', VP_BODY, { bareVp: true });
				expect(res).toEqual({ status: 503, body: { error: 'issuance_failed' } });
				expectReleasedWithIssuanceError();
			});

			it('returns 500 and releases when storing the credential fails', async () => {
				mockCredentialCreate.mockRejectedValue(new Error('db down'));
				const res = await participate(ORG, 'ex-1', VP_BODY, { bareVp: false });
				expect(res).toEqual({ status: 500, body: { error: 'issuance_failed' } });
				expectReleasedWithIssuanceError();
			});
		});
	});
});
