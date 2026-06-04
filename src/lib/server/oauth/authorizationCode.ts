import type { OAuthClient, Organization } from '@prisma/client';
import { createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '$lib/../prisma/client';
import {
	AUTHORIZATION_CODE_TTL_SECONDS,
	expiryFromNow,
	generateOpaqueToken,
	hashToken
} from './tokens';

export interface CreateAuthorizationCodeParams {
	org: Organization;
	client: OAuthClient;
	userId: string;
	redirectUri: string;
	scopes: string[];
	codeChallenge: string;
	codeChallengeMethod?: string;
}

/** Create an authorization code row and return the raw code (sha256 stored). */
export async function createAuthorizationCode(
	params: CreateAuthorizationCodeParams
): Promise<string> {
	const { org, client, userId, redirectUri, scopes, codeChallenge } = params;
	const code = generateOpaqueToken();
	await prisma.oAuthAuthorizationCode.create({
		data: {
			organizationId: org.id,
			clientId: client.id,
			userId,
			codeHash: hashToken(code),
			redirectUri,
			scopes,
			codeChallenge,
			codeChallengeMethod: params.codeChallengeMethod ?? 'S256',
			expiresAt: expiryFromNow(AUTHORIZATION_CODE_TTL_SECONDS)
		}
	});
	return code;
}

export interface ConsumeAuthorizationCodeParams {
	org: Organization;
	clientInternalId: string;
	code: string;
	redirectUri: string;
}

export type ConsumeAuthorizationCodeResult =
	| { ok: true; userId: string; scopes: string[]; codeChallenge: string }
	// `reuse` signals an already-consumed code: the caller MUST revoke tokens
	// previously issued for this user+client (spec §7.1.2.2).
	| { ok: false; reuse: true; userId: string }
	| { ok: false; reuse: false };

/**
 * Consume an authorization code exactly once. Rejects not-found / expired /
 * wrong-client / redirect-mismatch. On already-consumed (replay) returns a
 * `reuse` sentinel carrying the userId so the caller can revoke issued tokens.
 * Uses a guarded `updateMany` so a concurrent double-spend consumes only once.
 */
export async function consumeAuthorizationCode(
	params: ConsumeAuthorizationCodeParams
): Promise<ConsumeAuthorizationCodeResult> {
	const { org, clientInternalId, code, redirectUri } = params;
	const codeHash = hashToken(code);

	const row = await prisma.oAuthAuthorizationCode.findFirst({
		where: { codeHash, organizationId: org.id }
	});
	if (!row) return { ok: false, reuse: false };
	if (row.clientId !== clientInternalId) return { ok: false, reuse: false };
	if (row.redirectUri !== redirectUri) return { ok: false, reuse: false };

	// Replay: code was already consumed → signal reuse for token revocation.
	if (row.consumedAt) return { ok: false, reuse: true, userId: row.userId };

	if (row.expiresAt.getTime() <= Date.now()) return { ok: false, reuse: false };

	// Atomically claim the code: only the call that flips consumedAt from null
	// wins; a concurrent double-spend sees count === 0.
	const claimed = await prisma.oAuthAuthorizationCode.updateMany({
		where: { id: row.id, consumedAt: null },
		data: { consumedAt: new Date() }
	});
	if (claimed.count === 0) {
		// Lost the race → treat as reuse so the winner's tokens get revoked.
		return { ok: false, reuse: true, userId: row.userId };
	}

	return { ok: true, userId: row.userId, scopes: row.scopes, codeChallenge: row.codeChallenge };
}

/**
 * Verify a PKCE S256 challenge: base64url(sha256(ascii(verifier))) === challenge.
 * Constant-time compare over the derived challenge bytes.
 */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
	const derived = createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
	const a = Buffer.from(derived);
	const b = Buffer.from(codeChallenge);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
