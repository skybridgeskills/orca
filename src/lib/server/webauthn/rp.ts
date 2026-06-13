import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

// WebAuthn Relying Party derivation. ORCA is multi-org by domain, so the RP is the
// org's own domain (a passkey is bound to one org's domain — consistent with per-org
// User rows). The RP ID must be a bare hostname (no scheme, no port); the expected
// origin keeps the scheme + port. e.g. dev `localhost:5173` → rpID `localhost`,
// origin `http://localhost:5173`. NEVER hardcode the RP.

export interface OrgRp {
	rpID: string;
	rpName: string;
	expectedOrigin: string;
}

export function rpForOrg(org: { domain: string; name: string }): OrgRp {
	return {
		rpID: org.domain.split(':')[0],
		rpName: org.name,
		expectedOrigin: `${PUBLIC_HTTP_PROTOCOL}://${org.domain}`
	};
}
