import { json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { buildAuthenticationOptions } from '$lib/server/webauthn/ceremonies';
import { issueChallenge } from '$lib/server/webauthn/challenge';
import { rpForOrg } from '$lib/server/webauthn/rp';

import type { RequestHandler } from './$types';

import { USE_SECURE_COOKIES } from '$env/static/private';

// Step 1 of usernameless passkey login: build WebAuthn authentication options for
// `@simplewebauthn/browser`'s `startAuthentication`. No auth is required — the user is,
// by definition, not yet logged in. `allowCredentials` is empty (discoverable credential,
// so no email is typed). The challenge is stored on a fresh pre-auth Session row (never
// the client) so verify can check it single-use, bound to this request's cookie.
export const POST: RequestHandler = async ({ locals, cookies }) => {
	const rp = rpForOrg(locals.org);
	const options = await buildAuthenticationOptions({ rp });

	// A pre-auth Session: invalid until the assertion verifies. It holds the challenge and
	// is the cookie-bound anchor the verify step loads. `code: ''` matches the email flow's
	// passwordless sessions; no user is connected yet.
	const session = await prisma.session.create({
		data: {
			code: '',
			valid: false,
			organizationId: locals.org.id,
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		}
	});

	await issueChallenge(session.id, options.challenge);

	cookies.set('sessionId', session.id, {
		secure: USE_SECURE_COOKIES == 'true',
		path: '/',
		expires: session.expiresAt,
		httpOnly: true
	});

	return json(options);
};
