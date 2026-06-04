import { json } from '@sveltejs/kit';

import {
	createClient,
	RegistrationError,
	toRegistrationResponse,
	validateRegistrationRequest
} from '$lib/server/oauth/clientRegistration';

import type { RequestHandler } from './$types';

// RFC7591 Dynamic Client Registration (§7.1.1). Unprotected.
export const POST: RequestHandler = async ({ request, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_client_metadata' }, { status: 400 });
	}

	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return json({ error: 'invalid_client_metadata' }, { status: 400 });
	}

	let normalized;
	try {
		normalized = validateRegistrationRequest(body as Record<string, unknown>, locals.org);
	} catch (err) {
		if (err instanceof RegistrationError) {
			return json({ error: err.error, error_description: err.error_description }, { status: 400 });
		}
		throw err;
	}

	const { client, clientSecret } = await createClient(locals.org, normalized);

	return json(toRegistrationResponse(client, clientSecret), {
		status: 201,
		headers: { 'Cache-Control': 'no-store' }
	});
};
