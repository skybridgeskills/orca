import type { OAuthAccessToken, OAuthClient, Organization } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';

import { SCOPE_OFFLINE_ACCESS } from './scopes';
import {
	ACCESS_TOKEN_TTL_SECONDS,
	REFRESH_TOKEN_TTL_SECONDS,
	expiryFromNow,
	generateOpaqueToken,
	hashToken
} from './tokens';

export interface IssueTokenPairParams {
	org: Organization;
	client: OAuthClient;
	userId: string;
	scopes: string[];
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string | null;
	expiresIn: number;
	scopes: string[];
}

/**
 * Issue a user-delegated access token (and refresh token iff offline_access
 * was granted). Stores only sha256 hashes. Returns raw values in memory.
 */
export async function issueTokenPair(params: IssueTokenPairParams): Promise<TokenPair> {
	const { org, client, userId, scopes } = params;
	const accessToken = generateOpaqueToken();
	const withRefresh = scopes.includes(SCOPE_OFFLINE_ACCESS);
	const refreshToken = withRefresh ? generateOpaqueToken() : null;

	await prisma.oAuthAccessToken.create({
		data: {
			organizationId: org.id,
			clientId: client.id,
			userId,
			accessTokenHash: hashToken(accessToken),
			refreshTokenHash: refreshToken ? hashToken(refreshToken) : null,
			scopes,
			accessTokenExpiresAt: expiryFromNow(ACCESS_TOKEN_TTL_SECONDS),
			refreshTokenExpiresAt: refreshToken ? expiryFromNow(REFRESH_TOKEN_TTL_SECONDS) : null
		}
	});

	return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS, scopes };
}

export interface IssueClientCredentialsTokenParams {
	org: Organization;
	client: OAuthClient;
	scopes: string[];
}

export interface ClientCredentialsToken {
	accessToken: string;
	expiresIn: number;
	scopes: string[];
}

/**
 * Issue a userless (client_credentials) access token: `userId: null`, no
 * refresh token (per OAuth BCP, machine clients re-request). Used by the
 * Phase 4 token-endpoint client_credentials branch.
 */
export async function issueClientCredentialsToken(
	params: IssueClientCredentialsTokenParams
): Promise<ClientCredentialsToken> {
	const { org, client, scopes } = params;
	const accessToken = generateOpaqueToken();

	await prisma.oAuthAccessToken.create({
		data: {
			organizationId: org.id,
			clientId: client.id,
			userId: null,
			accessTokenHash: hashToken(accessToken),
			refreshTokenHash: null,
			scopes,
			accessTokenExpiresAt: expiryFromNow(ACCESS_TOKEN_TTL_SECONDS),
			refreshTokenExpiresAt: null
		}
	});

	return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS, scopes };
}

export interface RotateTokenPairParams {
	org: Organization;
	client: OAuthClient;
	refreshTokenRow: OAuthAccessToken;
	scopes: string[];
}

/**
 * Rotate a refresh token in place: update the same row with fresh access +
 * refresh hashes, new expiries, and a cleared revokedAt. Returns the new pair.
 */
export async function rotateTokenPair(params: RotateTokenPairParams): Promise<TokenPair> {
	const { org, refreshTokenRow, scopes } = params;
	const accessToken = generateOpaqueToken();
	const refreshToken = generateOpaqueToken();

	await prisma.oAuthAccessToken.update({
		where: { id: refreshTokenRow.id, organizationId: org.id },
		data: {
			accessTokenHash: hashToken(accessToken),
			refreshTokenHash: hashToken(refreshToken),
			scopes,
			accessTokenExpiresAt: expiryFromNow(ACCESS_TOKEN_TTL_SECONDS),
			refreshTokenExpiresAt: expiryFromNow(REFRESH_TOKEN_TTL_SECONDS),
			revokedAt: null
		}
	});

	return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS, scopes };
}

/** Look up an active (not revoked, unexpired) refresh-token row by raw value. */
export async function findActiveRefreshToken(
	org: Organization,
	client: OAuthClient,
	rawRefresh: string
): Promise<OAuthAccessToken | null> {
	const row = await prisma.oAuthAccessToken.findFirst({
		where: {
			refreshTokenHash: hashToken(rawRefresh),
			organizationId: org.id,
			clientId: client.id
		}
	});
	if (!row) return null;
	if (row.revokedAt) return null;
	if (!row.refreshTokenExpiresAt || row.refreshTokenExpiresAt.getTime() <= Date.now()) {
		return null;
	}
	return row;
}

export interface AuthenticatedToken {
	token: OAuthAccessToken;
	/** Resource owner. May be null for client_credentials tokens. */
	userId: string | null;
	/** Accountable actor for writes (Option B). Non-null for any usable token. */
	actingUserId: string | null;
	scopes: string[];
}

/**
 * Authenticate a raw Bearer access token. Valid only if not revoked, unexpired,
 * and the owning client is not disabled. Updates lastUsedAt on success.
 *
 * `actingUserId = token.userId ?? token.client.createdByUserId`. For a
 * confidential client `createdByUserId` is always set (Phase 2/7 invariant), so
 * `actingUserId` is non-null for any usable token. Read endpoints ignore it;
 * write endpoints use it as `creatorId`.
 */
export async function authenticateBearer(
	org: Organization,
	rawAccessToken: string
): Promise<AuthenticatedToken | null> {
	const row = await prisma.oAuthAccessToken.findFirst({
		where: { accessTokenHash: hashToken(rawAccessToken), organizationId: org.id },
		include: { client: true }
	});
	if (!row) return null;
	if (row.revokedAt) return null;
	if (row.accessTokenExpiresAt.getTime() <= Date.now()) return null;
	if (row.client.disabledAt) return null;

	await prisma.oAuthAccessToken.update({
		where: { id: row.id },
		data: { lastUsedAt: new Date() }
	});

	return {
		token: row,
		userId: row.userId,
		actingUserId: row.userId ?? row.client.createdByUserId,
		scopes: row.scopes
	};
}

/**
 * Revoke the token row whose access OR refresh hash matches the raw value.
 * Idempotent. `hint` ('access_token' | 'refresh_token') is accepted per
 * RFC7009 but lookup checks both columns regardless.
 */
export async function revokeToken(
	org: Organization,
	rawToken: string,
	hint?: 'access_token' | 'refresh_token'
): Promise<void> {
	void hint;
	const tokenHash = hashToken(rawToken);
	await prisma.oAuthAccessToken.updateMany({
		where: {
			organizationId: org.id,
			OR: [{ accessTokenHash: tokenHash }, { refreshTokenHash: tokenHash }]
		},
		data: { revokedAt: new Date() }
	});
}

/** Bulk-revoke all of a user's tokens for one client (reuse detection, /apps). */
export async function revokeTokensForUserClient(
	org: Organization,
	userId: string,
	clientInternalId: string
): Promise<void> {
	await prisma.oAuthAccessToken.updateMany({
		where: {
			organizationId: org.id,
			userId,
			clientId: clientInternalId,
			revokedAt: null
		},
		data: { revokedAt: new Date() }
	});
}

/** Bulk-revoke ALL of a client's tokens regardless of user (admin disable). */
export async function revokeTokensForClient(
	org: Organization,
	clientInternalId: string
): Promise<void> {
	await prisma.oAuthAccessToken.updateMany({
		where: {
			organizationId: org.id,
			clientId: clientInternalId,
			revokedAt: null
		},
		data: { revokedAt: new Date() }
	});
}
