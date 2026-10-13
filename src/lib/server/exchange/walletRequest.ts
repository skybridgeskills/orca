import { json } from '@sveltejs/kit';

import { withCors } from './cors';
import { participate, type ParticipateResult } from './localExchange';

// Public endpoint: refuse oversized bodies before parsing. A DID-auth VP is a few KB.
const MAX_BODY_BYTES = 64 * 1024;

type BodyResult = { ok: true; body: unknown } | { ok: false; response: Response };

/** Reads a wallet POST body. An empty body is the VC-API "start the exchange" request. */
export async function readWalletBody(request: Request): Promise<BodyResult> {
	const declared = Number(request.headers.get('content-length') ?? 0);
	if (declared > MAX_BODY_BYTES) return { ok: false, response: tooLarge() };
	const text = await request.text();
	if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
		return { ok: false, response: tooLarge() };
	}
	if (text.trim() === '') return { ok: true, body: {} };
	try {
		return { ok: true, body: JSON.parse(text) };
	} catch {
		return {
			ok: false,
			response: withCors(
				json({ error: 'invalid_request', message: 'Body must be JSON.' }, { status: 400 })
			)
		};
	}
}

function tooLarge() {
	return withCors(json({ error: 'invalid_request', message: 'Body too large.' }, { status: 413 }));
}

/** Shared POST handler for the participate route and its LCW `/bare-vp` doorway. */
export async function handleParticipate(
	org: App.Organization,
	exchangeId: string,
	request: Request,
	options: { bareVp: boolean }
): Promise<Response> {
	const read = await readWalletBody(request);
	if (!read.ok) return read.response;
	let result: ParticipateResult;
	try {
		result = await participate(org, exchangeId, read.body, options);
	} catch (err) {
		// Without CORS headers a cross-origin wallet sees an opaque network error, not a 500.
		console.error('Unexpected exchange error', err);
		return withCors(json({ error: 'server_error' }, { status: 500 }));
	}
	return withCors(json(result.body, { status: result.status }));
}
