import type { OAuthClient } from '@prisma/client';
import { json } from '@sveltejs/kit';

import {
	findActiveRefreshToken,
	issueClientCredentialsToken,
	issueTokenPair,
	revokeTokensForUserClient,
	rotateTokenPair
} from '$lib/server/oauth/accessToken';
import { consumeAuthorizationCode, verifyPkceS256 } from '$lib/server/oauth/authorizationCode';
import { parseClientSecretBasic, verifyClient } from '$lib/server/oauth/clientAuth';
import { intersectSupportedApi, isScopeSubset, parseScopeString } from '$lib/server/oauth/scopes';

import type { RequestHandler } from './$types';

// RFC6749 token endpoint (§7.2). Serves authorization_code, refresh_token and
// client_credentials grants. Responses are never cached.
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store', Pragma: 'no-cache' } as const;

export const POST: RequestHandler = async ({ request, locals }) => {
	const org = locals.org;

	// All grants here authenticate the client via client_secret_basic.
	const credentials = parseClientSecretBasic(request.headers.get('authorization'));
	if (!credentials) {
		return oauthError('invalid_client', undefined, 401, {
			'WWW-Authenticate': 'Basic'
		});
	}
	const client = await verifyClient(org, credentials.clientId, credentials.clientSecret);
	if (!client) {
		return oauthError('invalid_client', undefined, 401, {
			'WWW-Authenticate': 'Basic'
		});
	}

	const form = await request.formData();
	const grantType = formString(form, 'grant_type');

	switch (grantType) {
		case 'authorization_code':
			return handleAuthorizationCode(org, client, form);
		case 'refresh_token':
			return handleRefreshToken(org, client, form);
		case 'client_credentials':
			return handleClientCredentials(org, client, form);
		default:
			return oauthError('unsupported_grant_type');
	}
};

async function handleAuthorizationCode(
	org: App.Organization,
	client: OAuthClient,
	form: FormData
): Promise<Response> {
	const code = formString(form, 'code');
	const redirectUri = formString(form, 'redirect_uri');
	const codeVerifier = formString(form, 'code_verifier');
	if (!code || !redirectUri || !codeVerifier) {
		return oauthError('invalid_grant');
	}

	const result = await consumeAuthorizationCode({
		org,
		clientInternalId: client.id,
		code,
		redirectUri
	});

	if (!result.ok) {
		// Replay of an already-consumed code: revoke any tokens previously issued
		// for this user+client (spec §7.1.2.2) before rejecting.
		if (result.reuse) {
			await revokeTokensForUserClient(org, result.userId, client.id);
		}
		return oauthError('invalid_grant');
	}

	if (!verifyPkceS256(codeVerifier, result.codeChallenge)) {
		return oauthError('invalid_grant');
	}

	// Scopes were already supported-intersected at authorization time.
	const pair = await issueTokenPair({
		org,
		client,
		userId: result.userId,
		scopes: result.scopes
	});

	return tokenResponse({
		access_token: pair.accessToken,
		token_type: 'bearer',
		expires_in: pair.expiresIn,
		...(pair.refreshToken ? { refresh_token: pair.refreshToken } : {}),
		scope: pair.scopes.join(' ')
	});
}

async function handleRefreshToken(
	org: App.Organization,
	client: OAuthClient,
	form: FormData
): Promise<Response> {
	const refreshToken = formString(form, 'refresh_token');
	if (!refreshToken) {
		return oauthError('invalid_grant');
	}

	const row = await findActiveRefreshToken(org, client, refreshToken);
	if (!row) {
		return oauthError('invalid_grant');
	}

	let scopes = row.scopes;
	const requestedScope = form.get('scope');
	if (typeof requestedScope === 'string' && requestedScope.length > 0) {
		const requested = parseScopeString(requestedScope);
		if (!isScopeSubset(requested, row.scopes)) {
			return oauthError('invalid_scope');
		}
		scopes = requested;
	}

	// Rotation always mints a fresh access+refresh pair on the same row.
	const pair = await rotateTokenPair({ org, client, refreshTokenRow: row, scopes });

	return tokenResponse({
		access_token: pair.accessToken,
		token_type: 'bearer',
		expires_in: pair.expiresIn,
		...(pair.refreshToken ? { refresh_token: pair.refreshToken } : {}),
		scope: pair.scopes.join(' ')
	});
}

async function handleClientCredentials(
	org: App.Organization,
	client: OAuthClient,
	form: FormData
): Promise<Response> {
	// Org machine-to-machine: only confidential service clients with the
	// client_credentials grant. verifyClient already rejected disabled/expired.
	if (
		client.clientType !== 'CONFIDENTIAL_SERVICE' ||
		!client.grantTypes.includes('client_credentials')
	) {
		return oauthError('unauthorized_client');
	}

	const rawScope = form.get('scope');
	const requested =
		typeof rawScope === 'string' && rawScope.length > 0
			? intersectSupportedApi(parseScopeString(rawScope))
			: client.scopes;

	if (requested.length === 0 || !isScopeSubset(requested, client.scopes)) {
		return oauthError('invalid_scope');
	}

	const token = await issueClientCredentialsToken({ org, client, scopes: requested });

	// No refresh_token (OAuth BCP: machine clients re-request).
	return tokenResponse({
		access_token: token.accessToken,
		token_type: 'bearer',
		expires_in: token.expiresIn,
		scope: token.scopes.join(' ')
	});
}

// --- helpers ------------------------------------------------------------------

function formString(form: FormData, key: string): string | undefined {
	const value = form.get(key);
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function tokenResponse(body: Record<string, unknown>): Response {
	return json(body, { headers: NO_STORE_HEADERS });
}

function oauthError(
	error: string,
	description?: string,
	status = 400,
	extraHeaders: Record<string, string> = {}
): Response {
	return json(
		{ error, ...(description ? { error_description: description } : {}) },
		{ status, headers: { ...NO_STORE_HEADERS, ...extraHeaders } }
	);
}
