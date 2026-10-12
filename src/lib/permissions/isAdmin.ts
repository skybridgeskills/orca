export const ADMIN_ROLES = ['GENERAL_ADMIN', 'CONTENT_ADMIN'] as const;

type UserWithOrgRole = { orgRole?: string | null } | null | undefined;

/** CONTENT_ADMIN or GENERAL_ADMIN (not BILLING_ADMIN). */
export function isAdmin(user?: UserWithOrgRole): boolean {
	return (ADMIN_ROLES as readonly string[]).includes(user?.orgRole ?? 'none');
}

/** GENERAL_ADMIN only — sensitive gates (apps credentials, etc.). */
export function isGeneralAdmin(user?: UserWithOrgRole): boolean {
	return user?.orgRole === 'GENERAL_ADMIN';
}
