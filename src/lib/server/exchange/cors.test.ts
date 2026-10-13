import { json } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';

import { corsPreflight, withCors } from './cors';

function expectWalletHeaders(res: Response) {
	expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
	expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Accept');
	expect(res.headers.get('Access-Control-Max-Age')).toBe('600');
	expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull();
	expect(res.headers.get('Cache-Control')).toBe('no-store');
}

describe('exchange CORS', () => {
	it('adds CORS and no-store headers, keeping status, body and existing headers', async () => {
		const res = withCors(json({ error: 'exchange_closed' }, { status: 410 }));
		expectWalletHeaders(res);
		expect(res.status).toBe(410);
		expect(res.headers.get('Content-Type')).toBe('application/json');
		expect(await res.json()).toEqual({ error: 'exchange_closed' });
	});

	it('overrides a Cache-Control header set upstream', () => {
		const res = withCors(new Response('x', { headers: { 'Cache-Control': 'max-age=60' } }));
		expect(res.headers.get('Cache-Control')).toBe('no-store');
	});

	it('answers a preflight with 204 and the CORS headers', async () => {
		const res = corsPreflight();
		expect(res.status).toBe(204);
		expectWalletHeaders(res);
		expect(await res.text()).toBe('');
	});
});
