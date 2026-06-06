import type { BrowserContext } from '@playwright/test';

// Seed a logged-in session straight into the cookie jar. hooks.server.ts looks
// the session up by id + org, so a valid Session row plus this cookie skips the
// magic-code login. The cookie domain is the host WITHOUT the port.
export async function setSessionCookie(
	context: BrowserContext,
	host: string,
	sessionId: string
): Promise<void> {
	await context.addCookies([{ name: 'sessionId', value: sessionId, domain: host, path: '/' }]);
}
