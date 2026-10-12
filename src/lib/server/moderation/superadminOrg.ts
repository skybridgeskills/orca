import { error } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';

// The dedicated superadmin Organization. Superadmins are real admin users of this org;
// they read cross-org reports in this org's inbox and may apply SITE-tier moderation.
// FAIL CLOSED: when `SUPERADMIN_ORG_ID` is unset, every superadmin cross-org capability
// is disabled.

/** The configured superadmin org id, or null when unset. */
export function superadminOrgId(): string | null {
	return env.SUPERADMIN_ORG_ID?.trim() || null;
}

/** True only when `orgId` is the configured superadmin org (false if env unset). */
export function isSuperadminOrg(orgId: string | null | undefined): boolean {
	const id = superadminOrgId();
	return !!id && !!orgId && orgId === id;
}

/**
 * Throwing guard for cross-org superadmin reads/writes. Requires a logged-in user
 * whose current org IS the superadmin org. Fail closed (403) otherwise — including
 * when `SUPERADMIN_ORG_ID` is unset. Callers must still bind access to the viewer's
 * own `Message` row (capability) and derive the origin org from `report.originOrgId`.
 */
export function requireSuperadminOrg(locals: App.Locals): void {
	if (!locals.session?.user?.id || !isSuperadminOrg(locals.org?.id)) {
		error(403, 'Superadmin access required');
	}
}
