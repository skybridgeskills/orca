import { json, text } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { parseClientSecretBasic, verifyClient } from '$lib/server/oauth/clientAuth';
import { revokeToken } from '$lib/server/oauth/accessToken';
import { hashToken } from '$lib/server/oauth/tokens';
import type { RequestHandler } from './$types';

// RFC7009 token revocation (§7.3). The authenticated client may only revoke its
// own tokens; unknown tokens still return 200 (RFC7009 §2.2).
export const POST: RequestHandler = async ({ request, locals }) => {
	const credentials = parseClientSecretBasic(request.headers.get('authorization'));
	if (!credentials) {
		return json(
			{ error: 'invalid_client' },
			{ status: 401, headers: { 'WWW-Authenticate': 'Basic' } }
		);
	}
	const client = await verifyClient(locals.org, credentials.clientId, credentials.clientSecret);
	if (!client) {
		return json(
			{ error: 'invalid_client' },
			{ status: 401, headers: { 'WWW-Authenticate': 'Basic' } }
		);
	}

	const form = await request.formData();
	const token = form.get('token');
	if (typeof token !== 'string' || token.length === 0) {
		// Nothing to revoke; per RFC7009 still respond 200.
		return text('', { status: 200 });
	}

	const hintRaw = form.get('token_type_hint');
	const hint = hintRaw === 'access_token' || hintRaw === 'refresh_token' ? hintRaw : undefined;

	// Only revoke a token that belongs to the authenticated client (RFC7009
	// §2.1). Unknown tokens — or tokens owned by another client — still 200
	// without changing state, so revocation does not leak token validity.
	const tokenHash = hashToken(token);
	const owned = await prisma.oAuthAccessToken.findFirst({
		where: {
			organizationId: locals.org.id,
			clientId: client.id,
			OR: [{ accessTokenHash: tokenHash }, { refreshTokenHash: tokenHash }]
		},
		select: { id: true }
	});
	if (owned) {
		await revokeToken(locals.org, token, hint);
	}

	return text('', { status: 200 });
};
