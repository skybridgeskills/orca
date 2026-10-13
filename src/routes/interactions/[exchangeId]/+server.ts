import { json, redirect } from '@sveltejs/kit';

import { corsPreflight, withCors } from '$lib/server/exchange/cors';
import { findExchange } from '$lib/server/exchange/localExchange';
import { buildLocalProtocols } from '$lib/server/exchange/protocols';

import type { RequestHandler } from './$types';

/** Same rule as the transaction service's `prefersHtml`. */
const prefersHtml = (accept: string | null) =>
	!!accept &&
	(accept.includes('text/html') ||
		(accept.includes('*/*') && !accept.includes('application/json')));

// VC-API interaction URL (the QR code target). Wallets get the protocols object; a person
// who scanned the code with a phone camera lands on the claim page instead.
export const GET: RequestHandler = async ({ locals, params, request }) => {
	let exchange;
	try {
		exchange = await findExchange(locals.org, params.exchangeId);
	} catch (err) {
		console.error('Unexpected interaction lookup error', err);
		return withCors(json({ error: 'server_error' }, { status: 500 }));
	}
	if (!exchange) return withCors(json({ error: 'not_found' }, { status: 404 }));
	if (prefersHtml(request.headers.get('accept'))) redirect(303, `/claims/${exchange.claimId}`);
	return withCors(json({ protocols: buildLocalProtocols(locals.org, exchange) }));
};

export const OPTIONS: RequestHandler = () => corsPreflight();
