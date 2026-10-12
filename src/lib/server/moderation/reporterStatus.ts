import { isAdmin } from '$lib/permissions/isAdmin';
import { isMember } from '$lib/server/permissions';

// Reporter status is computed from the live session at submit time and SNAPSHOTTED on
// the Report. Org admins are shown this status but never the reporter's identity.

export type ReporterStatusValue = 'ANONYMOUS' | 'USER' | 'MEMBER' | 'ADMIN';

/**
 * Classify the reporter relative to the origin org:
 * anonymous (no session) < user (logged in) < member (holds the membership achievement)
 * < admin. Derived server-side; never trust a client-supplied status.
 */
export async function computeReporterStatus(args: {
	session: App.SessionData | null | undefined;
	org: { id: string; json: App.OrganizationConfig };
}): Promise<ReporterStatusValue> {
	const user = args.session?.user;
	if (!user?.id) return 'ANONYMOUS';
	if (isAdmin(user)) return 'ADMIN';
	if (await isMember({ user, org: args.org })) return 'MEMBER';
	return 'USER';
}
