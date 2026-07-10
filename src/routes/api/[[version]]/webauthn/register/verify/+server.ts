import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { verifyRegistration } from '$lib/server/webauthn/ceremonies';
import { consumeChallenge } from '$lib/server/webauthn/challenge';
import { rpForOrg } from '$lib/server/webauthn/rp';
import stripTags from '$lib/utils/stripTags';

import type { RequestHandler } from './$types';

// Step 2 of passkey registration: verify the attestation server-side against the
// session-stored (single-use) challenge and persist the credential as a PASSKEY
// `Identifier`. Never trust client-sent credential fields beyond the raw `response`.
export const POST: RequestHandler = async ({ locals, request }) => {
	const session = locals.session;
	const user = session?.user;
	if (!session || !user) error(401, m.fuzzy_brave_otter_guard());

	const body = await request.json();
	const response = body?.response;
	const label: string = typeof body?.label === 'string' ? body.label : '';

	// Read the challenge only from the session row bound to this request's cookie.
	const sessionRow = await prisma.session.findUnique({
		where: { id: session.id },
		select: { id: true, passkeyChallenge: true, passkeyChallengeExpiresAt: true }
	});
	if (!sessionRow) error(400, m.zesty_calm_finch_falter());

	const challenge = await consumeChallenge(sessionRow);
	if (!challenge) error(400, m.zesty_calm_finch_falter());

	// @simplewebauthn throws on malformed responses; treat any failure (thrown or null)
	// as a verification failure, never a 500.
	const rp = rpForOrg(locals.org);
	let cred: Awaited<ReturnType<typeof verifyRegistration>> = null;
	try {
		cred = await verifyRegistration({ rp, expectedChallenge: challenge, response });
	} catch (e: unknown) {
		console.error(e);
		cred = null;
	}
	if (!cred) error(400, m.zesty_calm_finch_falter());

	// Reject a credentialId already registered in this org (duplicate / replay).
	const duplicate = await prisma.identifier.findFirst({
		where: { organizationId: locals.org.id, type: 'PASSKEY', identifier: cred.credentialId }
	});
	if (duplicate) error(400, m.dusky_keen_robin_repeat());

	const createdAt = new Date();
	const credentialJson = {
		publicKey: cred.publicKey,
		counter: cred.counter,
		transports: cred.transports,
		deviceType: cred.deviceType,
		backedUp: cred.backedUp,
		label: stripTags(label) || m.tidy_lush_quail_dwell()
		// `lastUsedAt` is omitted (optional in App.PasskeyCredential) until the first
		// successful assertion; an absent value is the "never used" sentinel.
	} satisfies App.PasskeyCredential;

	const created = await prisma.identifier.create({
		data: {
			type: 'PASSKEY',
			identifier: cred.credentialId,
			organizationId: locals.org.id,
			userId: user.id,
			verifiedAt: createdAt,
			visibility: 'PRIVATE',
			json: credentialJson
		}
	});

	// Never return publicKey / counter — only safe display metadata.
	return json({
		ok: true,
		passkey: {
			id: created.id,
			label: credentialJson.label,
			deviceType: cred.deviceType,
			createdAt
		}
	});
};
