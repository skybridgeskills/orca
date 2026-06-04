import type { OAuthClient } from '@prisma/client';
import { error, fail, redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { createAuthorizationCode } from '$lib/server/oauth/authorizationCode';
import { intersectSupported, isScopeSubset, parseScopeString } from '$lib/server/oauth/scopes';

import type { Actions, PageServerLoad } from './$types';

// RFC6749 §4.1.1 authorization endpoint, rendered as a consent screen.
// Bad `client_id`/`redirect_uri` MUST NOT redirect (we cannot trust the target);
// they render a standalone error. Other validation failures redirect back to the
// (verified) `redirect_uri` with an `error`/`state` per OB3 §7.1.2.1.

interface AuthValidation {
	client: OAuthClient;
	redirectUri: string;
	state: string;
	codeChallenge: string;
	codeChallengeMethod: string;
	scopes: string[];
}

/**
 * Build a `redirect_uri?error=...&state=...` URL, preserving any query the
 * client registered on its redirect URI. Returns null if the URI is unparseable.
 */
function buildErrorRedirect(redirectUri: string, errorCode: string, state: string): string | null {
	try {
		const target = new URL(redirectUri);
		target.searchParams.set('error', errorCode);
		if (state) target.searchParams.set('state', state);
		return target.toString();
	} catch {
		return null;
	}
}

function buildSuccessRedirect(redirectUri: string, code: string, scope: string, state: string) {
	const target = new URL(redirectUri);
	target.searchParams.set('code', code);
	target.searchParams.set('scope', scope);
	if (state) target.searchParams.set('state', state);
	return target.toString();
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const responseType = url.searchParams.get('response_type');
	const clientId = url.searchParams.get('client_id');
	const redirectUri = url.searchParams.get('redirect_uri');
	const scope = url.searchParams.get('scope');
	const state = url.searchParams.get('state');
	const codeChallenge = url.searchParams.get('code_challenge');
	const codeChallengeMethod = url.searchParams.get('code_challenge_method');

	// --- Non-redirectable validation: unknown client / bad redirect_uri --------
	if (!clientId) {
		return { fatalError: 'unknown_client' as const };
	}
	const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
	if (!client || client.organizationId !== locals.org.id) {
		return { fatalError: 'unknown_client' as const };
	}
	if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
		return { fatalError: 'invalid_redirect_uri' as const };
	}

	// --- Redirectable validation: send errors back to the verified redirect_uri -
	let redirectError: string | null = null;
	if (responseType !== 'code') {
		redirectError = 'unsupported_response_type';
	} else if (!codeChallenge || codeChallengeMethod !== 'S256') {
		redirectError = 'invalid_request';
	} else if (!state) {
		redirectError = 'invalid_request';
	}

	const requested = intersectSupported(parseScopeString(scope));
	if (!redirectError) {
		if (requested.length === 0 || !isScopeSubset(requested, client.scopes)) {
			redirectError = 'invalid_scope';
		}
	}

	if (redirectError) {
		const errorUrl = buildErrorRedirect(redirectUri, redirectError, state ?? '');
		if (errorUrl) {
			redirect(302, errorUrl);
		}
		// Unparseable redirect target: fall back to a non-redirecting error.
		return { fatalError: 'invalid_redirect_uri' as const };
	}

	// --- Login gate ------------------------------------------------------------
	if (!locals.session?.user) {
		redirect(302, '/login?next=' + encodeURIComponent(url.pathname + url.search));
	}

	// At this point all redirectable checks passed, so state/codeChallenge are set.
	return {
		client: {
			clientName: client.clientName,
			clientUri: client.clientUri,
			logoUri: client.logoUri,
			tosUri: client.tosUri,
			policyUri: client.policyUri
		},
		scopes: requested,
		params: {
			clientId,
			redirectUri,
			state: state as string,
			codeChallenge: codeChallenge as string,
			codeChallengeMethod: codeChallengeMethod as string,
			scope: requested.join(' ')
		}
	};
};

/**
 * Re-validate the hidden form fields against the database. We never trust the
 * session for client/redirect/scope identity — only for the logged-in user.
 */
async function revalidate(formData: FormData, orgId: string): Promise<AuthValidation | null> {
	const clientId = formData.get('clientId')?.toString();
	const redirectUri = formData.get('redirectUri')?.toString();
	const state = formData.get('state')?.toString() ?? '';
	const codeChallenge = formData.get('codeChallenge')?.toString();
	const codeChallengeMethod = formData.get('codeChallengeMethod')?.toString();
	const scope = formData.get('scope')?.toString();

	if (!clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== 'S256') {
		return null;
	}

	const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
	if (!client || client.organizationId !== orgId) return null;
	if (!client.redirectUris.includes(redirectUri)) return null;

	const scopes = intersectSupported(parseScopeString(scope));
	if (scopes.length === 0 || !isScopeSubset(scopes, client.scopes)) return null;

	return { client, redirectUri, state, codeChallenge, codeChallengeMethod, scopes };
}

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		if (!locals.session?.user) {
			error(401);
		}
		const formData = await request.formData();
		const valid = await revalidate(formData, locals.org.id);
		if (!valid) {
			return fail(400);
		}

		const code = await createAuthorizationCode({
			org: locals.org,
			client: valid.client,
			userId: locals.session.user.id,
			redirectUri: valid.redirectUri,
			scopes: valid.scopes,
			codeChallenge: valid.codeChallenge,
			codeChallengeMethod: valid.codeChallengeMethod
		});

		redirect(
			302,
			buildSuccessRedirect(valid.redirectUri, code, valid.scopes.join(' '), valid.state)
		);
	},

	deny: async ({ request, locals }) => {
		const formData = await request.formData();
		const valid = await revalidate(formData, locals.org.id);
		if (!valid) {
			return fail(400);
		}
		const errorUrl = buildErrorRedirect(valid.redirectUri, 'access_denied', valid.state);
		if (!errorUrl) {
			return fail(400);
		}
		redirect(302, errorUrl);
	}
};
