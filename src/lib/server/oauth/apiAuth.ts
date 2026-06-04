import { authenticateBearer } from '$lib/server/oauth/accessToken';
import { isScopeSubset } from '$lib/server/oauth/scopes';

/** Parse `Authorization: Bearer <token>`. */
export function parseBearer(authHeader: string | null): string | null {
	if (!authHeader?.startsWith('Bearer ')) return null;
	const t = authHeader.slice(7).trim();
	return t.length ? t : null;
}

export interface ApiAuthResult {
	via: 'session' | 'client_credentials';
	userId: string | null; // resource owner: the session user, or null for client_credentials
	actingUserId: string; // accountable actor for writes (Option B): session user, or the app's owner
	scopes: string[];
}

/**
 * Resolve org-scoped API auth: a logged-in session OR a client_credentials
 * bearer carrying ALL of `requiredScopes`. Returns an error tag when neither holds.
 * Session callers are treated as fully authorised for the existing UI surface
 * (scopes only constrain machine tokens). `actingUserId` is what write endpoints
 * attribute as creator: the session user, or the app's owner for a machine token.
 */
export async function resolveApiAuth(
	event: { request: Request; locals: App.Locals },
	requiredScopes: string[]
): Promise<ApiAuthResult | { error: 'unauthorized' | 'insufficient_scope' }> {
	if (event.locals.session?.user) {
		const uid = event.locals.session.user.id;
		return { via: 'session', userId: uid, actingUserId: uid, scopes: [] };
	}
	const raw = parseBearer(event.request.headers.get('authorization'));
	if (!raw) return { error: 'unauthorized' };
	const authd = await authenticateBearer(event.locals.org, raw); // rejects disabled clients (Phase 2)
	if (!authd) return { error: 'unauthorized' };
	// Invariant (Phase 2/7): a confidential client always has an owner, so a usable
	// machine token always resolves an actingUserId. Fail closed if it ever doesn't.
	if (authd.actingUserId === null) return { error: 'unauthorized' };
	if (!isScopeSubset(requiredScopes, authd.scopes)) return { error: 'insufficient_scope' };
	return {
		via: 'client_credentials',
		userId: authd.userId,
		actingUserId: authd.actingUserId,
		scopes: authd.scopes
	};
}
