/**
 * A user as shown in pickers and search results. Client-safe (no server imports).
 */
export interface UserSummary {
	id: string;
	givenName: string | null;
	familyName: string | null;
	/** Present only when the caller may see emails (admins). */
	email?: string | null;
}

/** Name, else email, else null (the caller shows a "Member without a name" message). */
export function userLabel(
	u: Pick<UserSummary, 'givenName' | 'familyName' | 'email'>
): string | null {
	const name = `${u.givenName ?? ''} ${u.familyName ?? ''}`.trim();
	return name || u.email || null;
}
