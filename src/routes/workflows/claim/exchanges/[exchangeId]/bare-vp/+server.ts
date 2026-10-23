import { corsPreflight } from '$lib/server/exchange/cors';
import { handleParticipate } from '$lib/server/exchange/walletRequest';

import type { RequestHandler } from './$types';

// LCW mobile doorway (as in the transaction service): LCW posts a bare presentation and
// reads a bare presentation back, not the VC-API `{ verifiablePresentation }` envelope.
export const POST: RequestHandler = ({ locals, params, request }) =>
	handleParticipate(locals.org, params.exchangeId, request, { bareVp: true });

export const OPTIONS: RequestHandler = () => corsPreflight();
