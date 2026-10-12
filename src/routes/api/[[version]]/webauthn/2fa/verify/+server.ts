import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { verifyAuthentication } from '$lib/server/webauthn/ceremonies';
import { consumeChallenge } from '$lib/server/webauthn/challenge';
import { findPasskeyByCredentialId, updatePasskeyCounter } from '$lib/server/webauthn/passkeys';
import { rpForOrg } from '$lib/server/webauthn/rp';

import type { RequestHandler } from './$types';

// Second factor of superadmin-org 2FA login. The email factor is already satisfied on the
// cookie-bound Session (`emailVerifiedAt` set, `valid:false`, see login `verify`). This
// endpoint completes login with a passkey assertion that is verified server-side against
// the session's single-use challenge. Neither factor can be skipped or swapped:
//   - The session is loaded by the request cookie and must be `valid:false` (not already
//     activated) AND have `emailVerifiedAt` set (the email factor cannot be skipped).
//   - The asserted credential must belong to THIS session's `userId` — a different user's
//     passkey is rejected, so the two factors can't be swapped across users.
// On success the rolling signature counter is persisted and the session is activated.
export const POST: RequestHandler = async ({ locals, cookies, request }) => {
	const body = await request.json();
	const response = body?.response;
	const sessionId = cookies.get('sessionId');
	if (!sessionId) error(401, m.glossy_lucky_swan_unauth());

	// Load the cookie-bound, email-verified pre-auth Session (org-scoped, still invalid).
	const session = await prisma.session.findFirst({
		where: { id: sessionId, organizationId: locals.org.id },
		select: {
			id: true,
			userId: true,
			valid: true,
			emailVerifiedAt: true,
			passkeyChallenge: true,
			passkeyChallengeExpiresAt: true
		}
	});
	// Reject if missing, already activated, the email factor isn't done, or no known user.
	if (!session || session.valid || !session.emailVerifiedAt || !session.userId)
		error(401, m.glossy_lucky_swan_unauth());

	// Single-use challenge: consumed (cleared) before any verification so it can't be replayed.
	const challenge = await consumeChallenge(session);
	if (!challenge) error(401, m.glossy_lucky_swan_unauth());

	// Resolve the credential server-side from the assertion's id, and require it to belong
	// to THIS session's user — never trust the client to pick whose passkey is used.
	const passkey = await findPasskeyByCredentialId(locals.org.id, response?.id);
	if (!passkey || passkey.userId !== session.userId) error(401, m.glossy_lucky_swan_unauth());

	// @simplewebauthn throws on malformed responses; treat any failure as a 401, never a 500.
	const rp = rpForOrg(locals.org);
	let result: Awaited<ReturnType<typeof verifyAuthentication>> = null;
	try {
		result = await verifyAuthentication({ rp, expectedChallenge: challenge, response, passkey });
	} catch {
		result = null;
	}
	if (!result) error(401, m.glossy_lucky_swan_unauth());

	// Persist the rolling signature counter (+ lastUsedAt) for clone/replay detection.
	await updatePasskeyCounter(passkey.identifierId, passkey.credential, result.newCounter);

	// Both factors satisfied — activate the session.
	const activatedSession = await prisma.session.update({
		where: { id: session.id },
		data: { valid: true },
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
