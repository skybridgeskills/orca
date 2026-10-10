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
