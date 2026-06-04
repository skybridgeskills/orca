import { fail, redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { revokeTokensForUserClient } from '$lib/server/oauth/accessToken';

import type { Actions, PageServerLoad } from './$types';

export interface ConnectedApp {
	clientInternalId: string;
	clientName: string;
	clientUri: string;
	logoUri: string;
	scopes: string[];
	lastUsedAt: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session?.user) {
		redirect(302, '/login?next=/apps');
	}

	const now = new Date();

	// Personal (USER_DELEGATED) apps only. Org client_credentials apps are
	// admin-managed on /about/settings/apps (Phase 7); the userId filter already
	// excludes userless tokens, and the explicit clientType makes intent clear.
	const tokens = await prisma.oAuthAccessToken.findMany({
		where: {
			organizationId: locals.org.id,
			userId: locals.session.user.id,
			revokedAt: null,
			client: { clientType: 'USER_DELEGATED' }
		},
		include: { client: true }
	});

	// Group by client; keep only clients with at least one token that is still
	// usable (unexpired access token, or a still-valid refresh token).
	const byClient = new Map<string, ConnectedApp>();
	for (const token of tokens) {
		const accessLive = token.accessTokenExpiresAt.getTime() > now.getTime();
		const refreshLive =
			token.refreshTokenExpiresAt !== null && token.refreshTokenExpiresAt.getTime() > now.getTime();
		if (!accessLive && !refreshLive) continue;

		const existing = byClient.get(token.clientId);
		const lastUsed = token.lastUsedAt ?? null;
		if (existing) {
			existing.scopes = Array.from(new Set([...existing.scopes, ...token.scopes]));
			if (
				lastUsed &&
				(!existing.lastUsedAt || lastUsed.getTime() > new Date(existing.lastUsedAt).getTime())
			) {
				existing.lastUsedAt = lastUsed.toISOString();
			}
		} else {
			byClient.set(token.clientId, {
				clientInternalId: token.clientId,
				clientName: token.client.clientName,
				clientUri: token.client.clientUri,
				logoUri: token.client.logoUri,
				scopes: [...token.scopes],
				lastUsedAt: lastUsed ? lastUsed.toISOString() : null
			});
		}
	}

	const apps = Array.from(byClient.values()).sort((a, b) =>
		a.clientName.localeCompare(b.clientName)
	);

	return { apps };
};

export const actions: Actions = {
	revoke: async ({ request, locals }) => {
		if (!locals.session?.user) {
			redirect(302, '/login?next=/apps');
		}
		const formData = await request.formData();
		const clientInternalId = formData.get('clientInternalId')?.toString();
		if (!clientInternalId) {
			return fail(400);
		}

		// Confirm the user actually has a (personal) token for this client before
		// revoking — never reveal or act on clients the user isn't connected to.
		const token = await prisma.oAuthAccessToken.findFirst({
			where: {
				organizationId: locals.org.id,
				userId: locals.session.user.id,
				clientId: clientInternalId,
				client: { clientType: 'USER_DELEGATED' }
			}
		});
		if (!token) {
			return fail(404);
		}

		await revokeTokensForUserClient(locals.org, locals.session.user.id, clientInternalId);

		// Also invalidate any not-yet-consumed authorization codes for this client,
		// so a stale code cannot be exchanged for a fresh token after revocation.
		await prisma.oAuthAuthorizationCode.updateMany({
			where: {
				organizationId: locals.org.id,
				userId: locals.session.user.id,
				clientId: clientInternalId,
				consumedAt: null
			},
			data: { consumedAt: new Date() }
		});

		return { success: true };
	}
};
