export const SCOPE_CREDENTIAL_READONLY =
	'https://purl.imsglobal.org/spec/ob/v3p0/scope/credential.readonly';
export const SCOPE_OFFLINE_ACCESS = 'offline_access';

/** Scopes this Host will advertise and grant (Q2). */
export const SUPPORTED_SCOPES = [SCOPE_CREDENTIAL_READONLY, SCOPE_OFFLINE_ACCESS] as const;

export function parseScopeString(scope: string | null | undefined): string[] {
	return (scope ?? '').split(/\s+/).filter(Boolean);
}

/** Returns only the requested scopes that are supported (drops upsert/profile, Q2). */
export function intersectSupported(requested: string[]): string[] {
	return requested.filter((s) => (SUPPORTED_SCOPES as readonly string[]).includes(s));
}

/** True if every scope in `subset` is present in `granted`. */
export function isScopeSubset(subset: string[], granted: string[]): boolean {
	return subset.every((s) => granted.includes(s));
}

// --- API scope taxonomy (client_credentials, org-level) -----------------------
// Short, 1EdTech-style names (NOT full URLs). One read/write scope per API
// resource, so admins grant least-privilege and we can wire more endpoints
// later WITHOUT a model change. Adding a scope = add one entry here + (when
// ready) enforce it on its endpoint(s). An unenforced scope simply grants
// nothing until its endpoint is wired (fail-closed: machine tokens are
// rejected by endpoints that don't yet accept them).
export interface ApiScopeDef {
	scope: string; // e.g. 'AchievementClaim.readonly'
	resource: string; // 'AchievementClaim'
	access: 'readonly' | 'write';
	endpoints: string[]; // documentation of which /api routes it governs
	enforced: boolean; // true once an endpoint actually checks it
}

export const API_SCOPES: ApiScopeDef[] = [
	{
		scope: 'Achievement.readonly',
		resource: 'Achievement',
		access: 'readonly',
		endpoints: ['GET /api/v1/achievements'],
		enforced: false
	},
	{
		scope: 'AchievementCategory.readonly',
		resource: 'AchievementCategory',
		access: 'readonly',
		endpoints: ['GET /api/v1/achievementCategories'],
		enforced: false
	},
	{
		scope: 'AchievementClaim.readonly',
		resource: 'AchievementClaim',
		access: 'readonly',
		endpoints: ['GET /api/v1/achievementClaims'],
		enforced: true
	}, // Phase 7
	{
		scope: 'AchievementClaim.write',
		resource: 'AchievementClaim',
		access: 'write',
		endpoints: ['POST /api/v1/achievements/{id}/award'],
		enforced: false
	},
	{
		scope: 'Invitation.readonly',
		resource: 'Invitation',
		access: 'readonly',
		endpoints: ['GET /api/v1/achievements/{id}/invites'],
		enforced: false
	},
	{
		scope: 'Invitation.write',
		resource: 'Invitation',
		access: 'write',
		endpoints: [
			'POST /api/v1/achievements/{id}/invites',
			'DELETE /api/v1/achievements/{id}/invites/{inviteId}'
		],
		enforced: false
	}
];

/** Named constant for the one API scope enforced in Phase 7 (mirrors the OB3 scope constants). */
export const SCOPE_ACHIEVEMENTCLAIM_READONLY = 'AchievementClaim.readonly';

/** Scopes a CONFIDENTIAL_SERVICE (client_credentials) client may be granted. */
export const SUPPORTED_API_SCOPES = API_SCOPES.map((s) => s.scope);

/** Human-friendly resource list reserved for user-delegated flows only.
 *  Backpack endpoints (GET /api/v1/backpack/{claims,invites}) read a single
 *  learner's own data and therefore need a resource owner — they are NOT
 *  grantable to client_credentials tokens. A future `Backpack.readonly`
 *  user-delegated scope would govern them. */
export const USER_DELEGATED_ONLY_ENDPOINTS = [
	'GET /api/v1/backpack/claims',
	'GET /api/v1/backpack/invites'
];

export function intersectSupportedApi(requested: string[]): string[] {
	return requested.filter((s) => SUPPORTED_API_SCOPES.includes(s));
}
