import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { buildRegistrationOptions } from '$lib/server/webauthn/ceremonies';
import { issueChallenge } from '$lib/server/webauthn/challenge';
import { getUserPasskeys } from '$lib/server/webauthn/passkeys';
import { rpForOrg } from '$lib/server/webauthn/rp';

import type { RequestHandler } from './$types';

// Step 1 of passkey registration: build (and return) the WebAuthn creation options
// for `@simplewebauthn/browser`'s `startRegistration`. The challenge is stored on the
// caller's Session row (never the client) so verify can check it single-use.
export const POST: RequestHandler = async ({ locals }) => {
	const session = locals.session;
	const user = session?.user;
	if (!session || !user) error(401, m.fuzzy_brave_otter_guard());

	const rp = rpForOrg(locals.org);
	const existing = await getUserPasskeys(user.id, locals.org.id);

	// Prefer the user's EMAIL identifier as the WebAuthn userName (what the
	// authenticator shows); fall back to the given name, then a stable placeholder.
	const email = await prisma.identifier.findFirst({
		where: { userId: user.id, organizationId: locals.org.id, type: 'EMAIL' }
	});
	const name = email?.identifier ?? user.givenName ?? user.id;

	const options = await buildRegistrationOptions({
		rp,
		user: { id: user.id, name },
		existing
	});

	await issueChallenge(session.id, options.challenge);

	return json(options);
};
