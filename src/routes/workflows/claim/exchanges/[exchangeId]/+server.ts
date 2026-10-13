import { corsPreflight } from '$lib/server/exchange/cors';
import { handleParticipate } from '$lib/server/exchange/walletRequest';

import type { RequestHandler } from './$types';

// VC-API claim exchange for orgs that sign locally (wire format of the DCC transaction
// service's `claim` workflow). A capability URL: no session is read.
export const POST: RequestHandler = ({ locals, params, request }) =>
	handleParticipate(locals.org, params.exchangeId, request, { bareVp: false });

export const OPTIONS: RequestHandler = () => corsPreflight();
