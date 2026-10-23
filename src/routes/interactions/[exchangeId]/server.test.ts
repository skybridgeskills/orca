import { isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildLocalProtocols } from '$lib/server/exchange/protocols';

vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

const mockFindFirst = vi.hoisted(() => vi.fn());
vi.mock('$lib/../prisma/client', () => ({
	prisma: { credentialExchange: { findFirst: mockFindFirst } }
}));

import { GET, OPTIONS } from './+server';

const ORG = { id: 'org-1', domain: 'badgistan.orcapods.org' } as App.Organization;
const EXCHANGE = {
	id: 'ex-1',
	organizationId: 'org-1',
	claimId: 'claim-1',
	challenge: 'challenge-abc',
	expiresAt: new Date(Date.now() + 60_000),
	startedAt: null,
	completedAt: null,
	errors: null,
	createdAt: new Date()
};

function event(accept: string | null, exchangeId = 'ex-1') {
	const headers: Record<string, string> = {};
	if (accept !== null) headers.Accept = accept;
	return {
		locals: { org: ORG },
		params: { exchangeId },
		request: new Request(`https://badgistan.orcapods.org/interactions/${exchangeId}?iuv=1`, {
			headers
		})
	} as unknown as Parameters<typeof GET>[0];
}

function expectWalletHeaders(res: Response) {
	expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
	expect(res.headers.get('Cache-Control')).toBe('no-store');
}

async function expectRedirect(promise: unknown) {
	try {
		await promise;
		expect.fail('expected a redirect');
	} catch (e) {
		expect(isRedirect(e)).toBe(true);
		if (isRedirect(e)) {
			expect(e.status).toBe(303);
			expect(e.location).toBe('/claims/claim-1');
		}
	}
}

describe('GET /interactions/[exchangeId]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindFirst.mockResolvedValue(EXCHANGE);
	});

	it.each([
		['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
		['text/html'],
		['*/*']
	])('redirects a browser (Accept: %s) to the claim page with 303', async (accept) => {
		await expectRedirect(GET(event(accept)));
	});

	it.each([['application/json'], ['application/json, */*'], [null]])(
		'returns the protocols object for Accept: %s, with CORS headers',
		async (accept) => {
			const res = (await GET(event(accept))) as Response;
			expect(res.status).toBe(200);
			expectWalletHeaders(res);
			expect(await res.json()).toEqual({ protocols: buildLocalProtocols(ORG, EXCHANGE) });
		}
	);

	it('looks the exchange up scoped to the org', async () => {
		await GET(event('application/json'));
		expect(mockFindFirst).toHaveBeenCalledWith({
			where: { id: 'ex-1', organizationId: 'org-1' }
		});
	});

	it('returns 404 with CORS headers for an unknown id (any Accept)', async () => {
		mockFindFirst.mockResolvedValue(null);
		for (const accept of ['application/json', 'text/html']) {
			const res = (await GET(event(accept, 'nope'))) as Response;
			expect(res.status).toBe(404);
			expectWalletHeaders(res);
			expect(await res.json()).toEqual({ error: 'not_found' });
		}
	});

	it('returns 500 with CORS headers when the lookup throws', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockFindFirst.mockRejectedValue(new Error('connection reset'));
		const res = (await GET(event('application/json'))) as Response;
		expect(res.status).toBe(500);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({ error: 'server_error' });
		spy.mockRestore();
	});

	it('OPTIONS returns 204 with CORS headers', async () => {
		const res = (await OPTIONS({} as Parameters<typeof OPTIONS>[0])) as Response;
		expect(res.status).toBe(204);
		expectWalletHeaders(res);
	});
});
