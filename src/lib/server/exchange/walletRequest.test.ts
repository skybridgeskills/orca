import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockParticipate = vi.hoisted(() => vi.fn());
vi.mock('./localExchange', () => ({ participate: mockParticipate }));

import { handleParticipate, readWalletBody } from './walletRequest';

const ORG = { id: 'org-1', domain: 'badgistan.orcapods.org' } as App.Organization;
const URL_ = 'https://badgistan.orcapods.org/workflows/claim/exchanges/ex-1';

function post(body?: string, headers: Record<string, string> = {}) {
	return new Request(URL_, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body
	});
}

function expectWalletHeaders(res: Response) {
	expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
	expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
	expect(res.headers.get('Cache-Control')).toBe('no-store');
}

describe('readWalletBody', () => {
	it.each([[undefined], [''], ['  \n ']])('treats an empty body (%j) as {}', async (body) => {
		expect(await readWalletBody(post(body))).toEqual({ ok: true, body: {} });
	});

	it('parses a JSON body', async () => {
		expect(await readWalletBody(post('{"verifiablePresentation":{"a":1}}'))).toEqual({
			ok: true,
			body: { verifiablePresentation: { a: 1 } }
		});
	});

	it('rejects invalid JSON with 400 and CORS headers', async () => {
		const read = await readWalletBody(post('{not json'));
		expect(read.ok).toBe(false);
		if (read.ok) return;
		expect(read.response.status).toBe(400);
		expectWalletHeaders(read.response);
		expect(await read.response.json()).toEqual({
			error: 'invalid_request',
			message: 'Body must be JSON.'
		});
	});

	it('rejects a body over 64 KB with 413 and CORS headers', async () => {
		const read = await readWalletBody(post(JSON.stringify({ pad: 'x'.repeat(64 * 1024) })));
		expect(read.ok).toBe(false);
		if (read.ok) return;
		expect(read.response.status).toBe(413);
		expectWalletHeaders(read.response);
		expect(await read.response.json()).toEqual({
			error: 'invalid_request',
			message: 'Body too large.'
		});
	});

	it('counts bytes, not characters, against the limit', async () => {
		// 22k three-byte characters: under 64k characters, over 64 KB.
		const read = await readWalletBody(post(JSON.stringify({ pad: '€'.repeat(22 * 1024) })));
		expect(read.ok).toBe(false);
		if (!read.ok) expect(read.response.status).toBe(413);
	});

	it('accepts a body of exactly 64 KB', async () => {
		const body = JSON.stringify({ pad: '' });
		const padded = body.replace('""', `"${'x'.repeat(64 * 1024 - body.length)}"`);
		expect(new TextEncoder().encode(padded).length).toBe(64 * 1024);
		expect((await readWalletBody(post(padded))).ok).toBe(true);
	});

	it('rejects on a declared Content-Length over the limit without reading the body', async () => {
		const request = post('{}', { 'Content-Length': String(64 * 1024 + 1) });
		const textSpy = vi.spyOn(request, 'text');
		const read = await readWalletBody(request);
		expect(read.ok).toBe(false);
		if (!read.ok) expect(read.response.status).toBe(413);
		expect(textSpy).not.toHaveBeenCalled();
	});
});

describe('handleParticipate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes the parsed body and options to participate and maps the result', async () => {
		mockParticipate.mockResolvedValue({ status: 410, body: { error: 'exchange_closed' } });
		const res = await handleParticipate(ORG, 'ex-1', post('{"a":1}'), { bareVp: true });
		expect(mockParticipate).toHaveBeenCalledWith(ORG, 'ex-1', { a: 1 }, { bareVp: true });
		expect(res.status).toBe(410);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({ error: 'exchange_closed' });
	});

	it('passes {} for an empty body', async () => {
		mockParticipate.mockResolvedValue({ status: 200, body: { verifiablePresentationRequest: {} } });
		const res = await handleParticipate(ORG, 'ex-1', post(), { bareVp: false });
		expect(mockParticipate).toHaveBeenCalledWith(ORG, 'ex-1', {}, { bareVp: false });
		expect(res.status).toBe(200);
		expectWalletHeaders(res);
	});

	it('does not call participate when the body is rejected', async () => {
		const res = await handleParticipate(ORG, 'ex-1', post('nope'), { bareVp: false });
		expect(res.status).toBe(400);
		expect(mockParticipate).not.toHaveBeenCalled();
	});

	it('turns an unexpected throw into a 500 that still carries the CORS headers', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockParticipate.mockRejectedValue(new Error('database unavailable'));
		const res = await handleParticipate(ORG, 'ex-1', post('{}'), { bareVp: false });
		expect(res.status).toBe(500);
		expectWalletHeaders(res);
		expect(await res.json()).toEqual({ error: 'server_error' });
		spy.mockRestore();
	});
});
