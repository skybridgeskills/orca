/**
 * Drop-in `fetch` replacement for server calls that may carry an `Authorization` header.
 * On non-2xx responses or network failures it logs a structured `console.warn` with the
 * request URL, status or error, and a truncated body when applicable, while only listing
 * header **names** (`headerKeys`) — never secret values. Successful (2xx) responses are
 * returned unchanged so callers can parse JSON themselves. **Do not swap this for raw
 * `fetch` in covered code paths** or credentials may be echoed into logs.
 */
async function redactedFetch(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const url = resolveRequestUrl(input);
	const headerKeys = collectHeaderKeyNames(init);

	try {
		const response = await fetch(input, init);
		if (response.ok) {
			return response;
		}
		let body = '';
		try {
			const text = await response.clone().text();
			body = text.slice(0, 500);
		} catch {
			// ignore
		}
		console.warn({ url, status: response.status, body, headerKeys });
		return response;
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		console.warn({ url, error: err.message, headerKeys });
		throw error;
	}
}

export default redactedFetch as typeof fetch;

function resolveRequestUrl(input: RequestInfo | URL): string {
	if (typeof input === 'string') {
		return input;
	}
	if (input instanceof URL) {
		return input.href;
	}
	if (input instanceof Request) {
		return input.url;
	}
	return String(input);
}

function collectHeaderKeyNames(init?: RequestInit): string[] {
	if (!init?.headers) {
		return [];
	}
	const h = init.headers;
	if (h instanceof Headers) {
		return [...h.keys()];
	}
	if (typeof h === 'object' && h !== null && !Array.isArray(h)) {
		return Object.keys(h as Record<string, unknown>);
	}
	return [];
}
