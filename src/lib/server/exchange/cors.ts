// Exchange and interaction URLs are capability URLs: the unguessable exchange id is the
// secret and no cookie is ever read, so any wallet origin may call them.
const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Accept',
	'Access-Control-Max-Age': '600'
};

/** Adds CORS and `no-store` headers to a wallet-facing response. */
export function withCors(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
	headers.set('Cache-Control', 'no-store');
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export function corsPreflight(): Response {
	return withCors(new Response(null, { status: 204 }));
}
