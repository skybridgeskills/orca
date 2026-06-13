import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { verifyAuthentication } from '$lib/server/webauthn/ceremonies';
import { consumeChallenge } from '$lib/server/webauthn/challenge';
import { findPasskeyByCredentialId, updatePasskeyCounter } from '$lib/server/webauthn/passkeys';
import { rpForOrg } from '$lib/server/webauthn/rp';

import type { RequestHandler } from './$types';

// Step 2 of usernameless passkey login: verify the assertion server-side against the
// pre-auth Session's single-use challenge, resolve the credential (and thus the user)
// from `response.id`, and — on success — activate the session. The client is never
// trusted for identity: the user is whoever owns the stored credential the assertion
// verifies against.
export const POST: RequestHandler = async ({ locals, cookies, request }) => {
	const body = await request.json();
	const response = body?.response;
	const sessionId = cookies.get('sessionId');
	if (!sessionId) error(401, m.glossy_lucky_swan_unauth());

	// Load the cookie-bound pre-auth Session (org-scoped, still invalid). Select only the
	// challenge fields needed to consume it.
	const session = await prisma.session.findFirst({
		where: { id: sessionId, organizationId: locals.org.id, valid: false },
		select: { id: true, passkeyChallenge: true, passkeyChallengeExpiresAt: true }
	});
	if (!session) error(401, m.glossy_lucky_swan_unauth());

	const challenge = await consumeChallenge(session);
	if (!challenge) error(401, m.glossy_lucky_swan_unauth());

	// Resolve the credential (and its user) server-side from the assertion's credentialId.
	const passkey = await findPasskeyByCredentialId(locals.org.id, response?.id);
	if (!passkey) error(401, m.glossy_lucky_swan_unauth());

	// @simplewebauthn throws on malformed responses; treat any failure (thrown or null)
	// as an auth failure, never a 500.
	const rp = rpForOrg(locals.org);
	let result: Awaited<ReturnType<typeof verifyAuthentication>> = null;
	try {
		result = await verifyAuthentication({ rp, expectedChallenge: challenge, response, passkey });
	} catch {
		result = null;
	}
	if (!result) error(401, m.glossy_lucky_swan_unauth());

	// Persist the rolling signature counter (+ lastUsedAt) for replay detection.
	await updatePasskeyCounter(passkey.identifierId, passkey.credential, result.newCounter);

	// P4 seam: superadmin-org users will require an already-email-verified session before
	// this passkey assertion completes login. That second-factor gate belongs here —
	// branch on the resolved user's org/role and reject (or require email verification)
	// before activating the session below. Not implemented in P3.

	// Activate the session for the credential's owner. The challenge was already cleared
	// by consumeChallenge, so the activated session carries no passkey state.
	const activatedSession = await prisma.session.update({
		where: { id: session.id },
		data: {
			valid: true,
			user: { connect: { id: passkey.userId } }
		},
		select: {
			id: true,
			user: true,
			valid: true,
			expiresAt: true,
			organizationId: true
		}
	});

	const next = typeof body?.next === 'string' && body.next.startsWith('/') ? body.next : '/';
	return json({ ok: true, session: activatedSession, location: next });
};
