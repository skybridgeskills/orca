import { json } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/../prisma/client';
import { authenticateBearer } from '$lib/server/oauth/accessToken';
import { SCOPE_CREDENTIAL_READONLY } from '$lib/server/oauth/scopes';
import {
	ensureClaimCredential,
	TransactionServiceIssuerError
} from '$lib/credentials/ensureClaimCredential';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';
import {
	buildLinkHeader,
	credentialsBaseUrl,
	getCredentialsResponseBody
} from '$lib/ob3/getCredentialsResponse';
import type { RequestHandler } from './$types';

// OB3 getCredentials (§6.2.2). Bearer-protected; requires the credential.readonly
// scope. Returns the token user's ACCEPTED claims as signed JSON-LD credentials.
// Pagination is offset-based per the spec (raw `limit`/`offset`, RFC8288 Link).
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const GET: RequestHandler = async ({ request, url, locals }) => {
	const org = locals.org;

	const bearer = parseBearer(request.headers.get('authorization'));
	const authed = bearer ? await authenticateBearer(org, bearer) : null;
	if (!authed) {
		return json(
			{ error: 'invalid_token' },
			{ status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
		);
	}

	if (!authed.scopes.includes(SCOPE_CREDENTIAL_READONLY)) {
		return json(
			{ error: 'insufficient_scope' },
			{ status: 403, headers: { 'WWW-Authenticate': 'Bearer' } }
		);
	}

	// client_credentials tokens have no resource owner and cannot read a user's
	// backpack — they carry API scopes, not credential.readonly, but guard anyway.
	if (!authed.userId) {
		return json({ error: 'insufficient_scope' }, { status: 403 });
	}

	const limit = clampLimit(url.searchParams.get('limit'));
	const offset = clampOffset(url.searchParams.get('offset'));
	const since = parseSince(url.searchParams.get('since'));

	const where = {
		organizationId: org.id,
		userId: authed.userId,
		claimStatus: 'ACCEPTED' as const,
		...(since ? { createdOn: { gt: since } } : {})
	};

	const [total, claims] = await Promise.all([
		prisma.achievementClaim.count({ where }),
		prisma.achievementClaim.findMany({
			where,
			include: {
				credential: true,
				achievement: true,
				user: { include: { identifiers: true } }
			},
			orderBy: { createdOn: 'asc' },
			skip: offset,
			take: limit
		})
	]);

	const credentials: Prisma.JsonValue[] = [];
	for (const claim of claims) {
		try {
			const cred = await ensureClaimCredential(claim, org, {
				regenerateIfStale: false,
				creatorUserId: authed.userId
			});
			credentials.push(cred.json);
		} catch (err) {
			if (err instanceof TransactionServiceIssuerError) {
				// Wallet-exchange orgs: serve a stored credential if one exists,
				// otherwise omit this claim (no local signing available).
				if (claim.credential) credentials.push(claim.credential.json);
				continue;
			}
			if (err instanceof IssuerMisconfiguredError) {
				// Skip the misconfigured claim rather than failing the whole request.
				continue;
			}
			throw err;
		}
	}

	const linkHeader = buildLinkHeader({
		baseUrl: credentialsBaseUrl(org),
		limit,
		offset,
		total
	});

	return json(getCredentialsResponseBody(credentials), {
		headers: {
			'X-Total-Count': String(total),
			Link: linkHeader
		}
	});
};

// --- helpers ------------------------------------------------------------------

/** Parse a raw `Authorization: Bearer <token>` header (RFC6750 §2.1). */
function parseBearer(authHeader: string | null): string | null {
	if (!authHeader) return null;
	const [scheme, token, ...rest] = authHeader.trim().split(/\s+/);
	if (rest.length > 0 || !token || scheme.toLowerCase() !== 'bearer') return null;
	return token;
}

function clampLimit(raw: string | null): number {
	const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
	return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

function clampOffset(raw: string | null): number {
	const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed < 0) return 0;
	return parsed;
}

function parseSince(raw: string | null): Date | null {
	if (!raw) return null;
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? null : date;
}
