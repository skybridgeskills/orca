import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { encrypt } from '$lib/server/secrets/orgConfigCrypto';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

import { createExchange, TransactionServiceUpstreamError } from './client';

vi.mock('./redactedFetch', () => ({ default: vi.fn() }));
import redactedFetch from './redactedFetch';

const mockFetch = vi.mocked(redactedFetch);

const ORG_ID = 'org-test';
const TEST_KEY_B64 = Buffer.from('01234567890123456789012345678901', 'utf8').toString('base64');

let encryptedApiKey: string;

function baseOrg(): App.Organization {
	return {
		id: ORG_ID,
		name: 'Test Org',
		json: {
			issuer: { type: 'transactionService' },
			transactionService: {
				url: 'https://ts.example.com/',
				tenantName: 'my-tenant',
				encryptedApiKey,
				apiKeyUpdatedAt: '2024-01-01T00:00:00.000Z'
			}
		} as App.Organization['json']
	} as App.Organization;
}

function okResponse(body: unknown) {
	return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function errResponse(status: number, body: string) {
	return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}

describe('createExchange', () => {
	const prevKey = process.env.ORG_CONFIG_ENCRYPTION_KEY;

	beforeEach(() => {
		process.env.ORG_CONFIG_ENCRYPTION_KEY = TEST_KEY_B64;
		encryptedApiKey = encrypt('plaintext-api-key');
		mockFetch.mockReset();
	});

	afterEach(() => {
		process.env.ORG_CONFIG_ENCRYPTION_KEY = prevKey;
	});

	it('returns exchangeId, protocols (four fields), and expiresAt in the ~10m window', async () => {
		const t0 = Date.now();
		const ucProtocols = {
			iu: 'https://i',
			vcapi: 'https://v',
			lcw: 'https://l',
			verifiablePresentationRequest: { foo: 'bar' }
		};
		mockFetch.mockResolvedValue(
			okResponse({
				id: 'ex-123',
				protocols: ucProtocols
			})
		);

		const result = await createExchange(baseOrg(), { vc: { a: 1 } });

		expect(result.exchangeId).toBe('ex-123');
		expect(result.protocols).toEqual(ucProtocols);
		const exp = new Date(result.expiresAt).getTime();
		const minT = t0 + 9.5 * 60 * 1000;
		const maxT = t0 + 10.5 * 60 * 1000;
		expect(exp).toBeGreaterThanOrEqual(minT);
		expect(exp).toBeLessThanOrEqual(maxT);
	});

	it('POSTs body variables.tenantName and stringified vc', async () => {
		const vc = { x: 2 };
		mockFetch.mockResolvedValue(
			okResponse({
				id: 'ex-1',
				protocols: {
					iu: '1',
					vcapi: '2',
					lcw: '3',
					verifiablePresentationRequest: {}
				}
			})
		);
		await createExchange(baseOrg(), { vc });

		const init = mockFetch.mock.calls[0][1]!;
		const bodyStr = init.body as string;
		expect(JSON.parse(bodyStr)).toEqual({
			variables: { tenantName: 'my-tenant', vc: JSON.stringify(vc) }
		});
	});

	it("sets Authorization to Bearer and the fixture's decrypted API key", async () => {
		mockFetch.mockResolvedValue(
			okResponse({
				id: 'ex-1',
				protocols: {
					iu: '1',
					vcapi: '2',
					lcw: '3',
					verifiablePresentationRequest: {}
				}
			})
		);
		await createExchange(baseOrg(), { vc: {} });

		const init = mockFetch.mock.calls[0][1]!;
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer plaintext-api-key');
	});

	it("normalizes URL to 'https://ts.example.com/workflows/claim/exchanges' without a trailing segment slash", async () => {
		mockFetch.mockResolvedValue(
			okResponse({
				id: 'ex-1',
				protocols: {
					iu: '1',
					vcapi: '2',
					lcw: '3',
					verifiablePresentationRequest: {}
				}
			})
		);
		await createExchange(baseOrg(), { vc: {} });
		expect(mockFetch.mock.calls[0][0]).toBe('https://ts.example.com/workflows/claim/exchanges');
	});

	it('throws TransactionServiceUpstreamError with status on non-2xx', async () => {
		mockFetch.mockResolvedValue(errResponse(502, 'bad gateway'));
		try {
			await createExchange(baseOrg(), { vc: {} });
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(TransactionServiceUpstreamError);
			expect((e as TransactionServiceUpstreamError).status).toBe(502);
		}
	});

	it('wraps network errors in TransactionServiceUpstreamError and sets cause to the original', async () => {
		const networkErr = new Error('ECONNREFUSED');
		mockFetch.mockRejectedValue(networkErr);
		try {
			await createExchange(baseOrg(), { vc: {} });
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(TransactionServiceUpstreamError);
			expect(e).not.toBe(networkErr);
			expect((e as Error & { cause?: unknown }).cause).toBe(networkErr);
		}
	});

	it('throws IssuerMisconfiguredError without calling fetch when encryptedApiKey is missing', async () => {
		const org = baseOrg();
		(org.json as App.OrganizationConfig).transactionService = {
			url: 'https://ts.example.com',
			tenantName: 't',
			encryptedApiKey: '',
			apiKeyUpdatedAt: '2024-01-01T00:00:00.000Z'
		};

		try {
			await createExchange(org, { vc: {} });
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(IssuerMisconfiguredError);
		}
		expect(mockFetch).toHaveBeenCalledTimes(0);
	});

	it('throws TransactionServiceUpstreamError with status 200 when id is missing in an otherwise OK body', async () => {
		mockFetch.mockResolvedValue(
			okResponse({
				protocols: {
					iu: '1',
					vcapi: '2',
					lcw: '3',
					verifiablePresentationRequest: {}
				}
			})
		);
		try {
			await createExchange(baseOrg(), { vc: {} });
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(TransactionServiceUpstreamError);
			expect((e as TransactionServiceUpstreamError).status).toBe(200);
			expect((e as Error).message).toContain('exchange id');
		}
	});
});
