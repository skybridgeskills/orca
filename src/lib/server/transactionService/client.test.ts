import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { encrypt } from '$lib/server/secrets/orgConfigCrypto';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

import { createExchange, getExchangeState, TransactionServiceUpstreamError } from './client';
import redactedFetch from './redactedFetch';

vi.mock('./redactedFetch', () => ({ default: vi.fn() }));

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
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
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

	const okProtocolsBody = {
		iu: 'https://host.example/interactions/ex-abc-123',
		vcapi: 'https://host.example/workflows/claim/exchanges/ex-abc-123',
		lcw: 'https://lcw.app/request?vcapi=https://host.example/workflows/claim/exchanges/ex-abc-123',
		verifiablePresentationRequest: {}
	};

	it('returns exchangeId parsed from iu, protocols (four fields), and expiresAt in the ~10m window', async () => {
		const t0 = Date.now();
		const ucProtocols = {
			iu: 'https://host.example/interactions/my-exchange-id',
			vcapi: 'https://host.example/workflows/claim/exchanges/my-exchange-id',
			lcw: 'https://lcw.app/request?vcapi=...',
			verifiablePresentationRequest: { foo: 'bar' }
		};
		mockFetch.mockResolvedValue(okResponse(ucProtocols));

		const result = await createExchange(baseOrg(), { vc: { a: 1 } });

		expect(result.exchangeId).toBe('my-exchange-id');
		expect(result.protocols).toEqual(ucProtocols);
		const exp = new Date(result.expiresAt).getTime();
		const minT = t0 + 9.5 * 60 * 1000;
		const maxT = t0 + 10.5 * 60 * 1000;
		expect(exp).toBeGreaterThanOrEqual(minT);
		expect(exp).toBeLessThanOrEqual(maxT);
	});

	it('POSTs body variables.tenantName and stringified vc', async () => {
		const vc = { x: 2 };
		mockFetch.mockResolvedValue(okResponse(okProtocolsBody));
		await createExchange(baseOrg(), { vc });

		const init = mockFetch.mock.calls[0][1]!;
		const bodyStr = init.body as string;
		expect(JSON.parse(bodyStr)).toEqual({
			variables: { tenantName: 'my-tenant', vc: JSON.stringify(vc) }
		});
	});

	it('sets Authorization to Basic with base64-encoded tenantName:apiKey', async () => {
		mockFetch.mockResolvedValue(okResponse(okProtocolsBody));
		await createExchange(baseOrg(), { vc: {} });

		const init = mockFetch.mock.calls[0][1]!;
		const expectedCredentials = Buffer.from('my-tenant:plaintext-api-key').toString('base64');
		expect((init.headers as Record<string, string>).Authorization).toBe(
			`Basic ${expectedCredentials}`
		);
	});

	it("normalizes URL to 'https://ts.example.com/workflows/claim/exchanges' without a trailing segment slash", async () => {
		mockFetch.mockResolvedValue(okResponse(okProtocolsBody));
		await createExchange(baseOrg(), { vc: {} });
		expect(mockFetch.mock.calls[0][0]).toBe('https://ts.example.com/workflows/claim/exchanges');
	});

	it('prefers a direct id field over parsing the iu URL', async () => {
		mockFetch.mockResolvedValue(okResponse({ id: 'direct-id', ...okProtocolsBody }));
		const result = await createExchange(baseOrg(), { vc: {} });
		expect(result.exchangeId).toBe('direct-id');
		expect(result.protocols.iu).toBe(okProtocolsBody.iu);
	});

	it('handles a future nested protocols shape with top-level id', async () => {
		mockFetch.mockResolvedValue(
			okResponse({
				id: 'nested-id',
				sequence: 0,
				state: 'pending',
				protocols: okProtocolsBody
			})
		);
		const result = await createExchange(baseOrg(), { vc: {} });
		expect(result.exchangeId).toBe('nested-id');
		expect(result.protocols).toEqual(okProtocolsBody);
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

	it('throws TransactionServiceUpstreamError with status 200 when the OK response body is not a protocols object', async () => {
		mockFetch.mockResolvedValue(okResponse(null));
		try {
			await createExchange(baseOrg(), { vc: {} });
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(TransactionServiceUpstreamError);
			expect((e as TransactionServiceUpstreamError).status).toBe(200);
			expect((e as Error).message).toContain('protocols');
		}
	});
});

describe('getExchangeState', () => {
	const prevKey = process.env.ORG_CONFIG_ENCRYPTION_KEY;

	beforeEach(() => {
		process.env.ORG_CONFIG_ENCRYPTION_KEY = TEST_KEY_B64;
		encryptedApiKey = encrypt('plaintext-api-key');
		mockFetch.mockReset();
	});

	afterEach(() => {
		process.env.ORG_CONFIG_ENCRYPTION_KEY = prevKey;
	});

	it('GETs the exchange URL under the normalized base URL', async () => {
		mockFetch.mockResolvedValue(okResponse({ state: 'pending' }));
		await getExchangeState(baseOrg(), 'ex-abc-123');

		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch.mock.calls[0][0]).toBe(
			'https://ts.example.com/workflows/claim/exchanges/ex-abc-123'
		);
		expect(mockFetch.mock.calls[0][1]!.method).toBe('GET');
	});

	it('URL-encodes the exchange id', async () => {
		mockFetch.mockResolvedValue(okResponse({ state: 'pending' }));
		await getExchangeState(baseOrg(), '../admin?x=1');
		expect(mockFetch.mock.calls[0][0]).toBe(
			'https://ts.example.com/workflows/claim/exchanges/..%2Fadmin%3Fx%3D1'
		);
	});

	it('sets Authorization to Basic with base64-encoded tenantName:apiKey', async () => {
		mockFetch.mockResolvedValue(okResponse({ state: 'pending' }));
		await getExchangeState(baseOrg(), 'ex-abc-123');

		const init = mockFetch.mock.calls[0][1]!;
		const expectedCredentials = Buffer.from('my-tenant:plaintext-api-key').toString('base64');
		expect((init.headers as Record<string, string>).Authorization).toBe(
			`Basic ${expectedCredentials}`
		);
	});

	it.each(['pending', 'active', 'complete', 'invalid'] as const)(
		'passes through the known state %s',
		async (state) => {
			mockFetch.mockResolvedValue(okResponse({ state, expires: '2099-01-01T00:00:00.000Z' }));
			expect(await getExchangeState(baseOrg(), 'ex-1')).toEqual({
				state,
				expiresAt: '2099-01-01T00:00:00.000Z'
			});
		}
	);

	it('maps an unknown state to pending', async () => {
		mockFetch.mockResolvedValue(okResponse({ state: 'exploded' }));
		expect(await getExchangeState(baseOrg(), 'ex-1')).toEqual({
			state: 'pending',
			expiresAt: null
		});
	});

	it('maps a missing state to pending and a non-string expires to null', async () => {
		mockFetch.mockResolvedValue(okResponse({ expires: 1234 }));
		expect(await getExchangeState(baseOrg(), 'ex-1')).toEqual({
			state: 'pending',
			expiresAt: null
		});
	});

	it('returns only state and expiresAt, never the rest of the exchange record', async () => {
		mockFetch.mockResolvedValue(
			okResponse({
				id: 'ex-1',
				sequence: 2,
				state: 'complete',
				expires: '2099-01-01T00:00:00.000Z',
				ttl: 600,
				variables: {
					tenantName: 'my-tenant',
					vc: JSON.stringify({ credentialSubject: { name: 'Secret Name' } })
				},
				vc: { credentialSubject: { name: 'Secret Name' } },
				step: 'claim'
			})
		);
		const result = await getExchangeState(baseOrg(), 'ex-1');

		expect(result).toEqual({ state: 'complete', expiresAt: '2099-01-01T00:00:00.000Z' });
		expect(Object.keys(result!).sort()).toEqual(['expiresAt', 'state']);
		expect(JSON.stringify(result)).not.toContain('Secret Name');
	});

	it('returns null on upstream 404', async () => {
		mockFetch.mockResolvedValue(errResponse(404, 'not found'));
		expect(await getExchangeState(baseOrg(), 'ex-missing')).toBeNull();
	});

	it('throws TransactionServiceUpstreamError with status on other non-2xx', async () => {
		mockFetch.mockResolvedValue(errResponse(500, 'boom'));
		try {
			await getExchangeState(baseOrg(), 'ex-1');
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(TransactionServiceUpstreamError);
			expect((e as TransactionServiceUpstreamError).status).toBe(500);
		}
	});

	it('wraps network errors in TransactionServiceUpstreamError and sets cause to the original', async () => {
		const networkErr = new Error('ECONNREFUSED');
		mockFetch.mockRejectedValue(networkErr);
		try {
			await getExchangeState(baseOrg(), 'ex-1');
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(TransactionServiceUpstreamError);
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

		await expect(getExchangeState(org, 'ex-1')).rejects.toBeInstanceOf(IssuerMisconfiguredError);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
