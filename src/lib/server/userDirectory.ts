import type { Prisma } from '@prisma/client';

import type { UserSummary } from '$lib/data/userSummary';
import { isAdmin } from '$lib/permissions/isAdmin';
import { COMMUNITY_VISIBLE } from '$lib/server/claimVisibility';
import {
	canViewMemberDirectory,
	membershipAchievementId,
	validMembershipClaimWhere
} from '$lib/server/permissions';

import { prisma } from '../../prisma/client';

const MAX_QUERY_LENGTH = 100;
const MAX_TOKENS = 5;

interface DirectoryViewer {
	id: string;
	orgRole: string | null;
}

interface DirectoryOrg {
	id: string;
	json: App.OrganizationConfig;
}

/**
 * The /members directory rules as a `where`, or null when the viewer may not see the
 * directory (membership gating on, viewer is a non-admin non-member). Org-scoped in
 * every branch. Shared by the /members page and `GET /api/v1/users` so they can't drift.
 */
export async function userDirectoryWhere({
	viewer,
	org
}: {
	viewer: DirectoryViewer;
	org: DirectoryOrg;
}): Promise<Prisma.UserWhereInput | null> {
	if (!(await canViewMemberDirectory({ user: viewer, org }))) return null;

	const membershipId = membershipAchievementId(org);
	if (membershipId === null || isAdmin(viewer)) return { organizationId: org.id };

	// Member (non-admin) viewer: only visible members, plus self (never hide self).
	return {
		organizationId: org.id,
		receivedAchievementClaims: { some: validMembershipClaimWhere(membershipId, org.id) },
		OR: [{ id: viewer.id }, { profileVisibility: { in: COMMUNITY_VISIBLE } }]
	};
}

/** The search words in `q`: trimmed, capped at 100 chars, at most 5. */
export function searchTokens(q: string): string[] {
	return q
		.trim()
		.slice(0, MAX_QUERY_LENGTH)
		.split(/\s+/)
		.filter((t) => t.length > 0)
		.slice(0, MAX_TOKENS);
}

/**
 * Every whitespace token must match givenName, familyName or (includeEmail) one of the
 * user's EMAIL identifiers in this org; case-insensitive contains. No tokens → `{}`.
 */
export function userSearchWhere(
	q: string,
	{ orgId, includeEmail }: { orgId: string; includeEmail: boolean }
): Prisma.UserWhereInput {
	const tokens = searchTokens(q);
	if (tokens.length === 0) return {};
	return {
		AND: tokens.map((t) => ({
			OR: [
				{ givenName: { contains: t, mode: 'insensitive' as const } },
				{ familyName: { contains: t, mode: 'insensitive' as const } },
				...(includeEmail
					? [
							{
								identifiers: {
									some: {
										organizationId: orgId,
										type: 'EMAIL' as const,
										identifier: { contains: t, mode: 'insensitive' as const }
									}
								}
							}
						]
					: [])
			]
		}))
	};
}

/** `select` for summaries; this org's EMAIL identifiers only when includeEmail. */
export function userSummarySelect({
	orgId,
	includeEmail
}: {
	orgId: string;
	includeEmail: boolean;
}): Prisma.UserSelect {
	return {
		id: true,
		givenName: true,
		familyName: true,
		...(includeEmail
			? {
					identifiers: {
						where: { organizationId: orgId, type: 'EMAIL' },
						select: { identifier: true, verifiedAt: true },
						orderBy: { identifier: 'asc' }
					}
				}
			: {})
	};
}

interface SummaryRow {
	id: string;
	givenName: string | null;
	familyName: string | null;
	identifiers?: { identifier: string; verifiedAt: Date | null }[];
}

/** Email = the first verified EMAIL identifier, else the first, else null. */
export function toUserSummary(
	row: SummaryRow,
	{ includeEmail }: { includeEmail: boolean }
): UserSummary {
	const summary: UserSummary = {
		id: row.id,
		givenName: row.givenName,
		familyName: row.familyName
	};
	if (includeEmail) {
		const emails = row.identifiers ?? [];
		summary.email = (emails.find((e) => e.verifiedAt) ?? emails[0])?.identifier ?? null;
	}
	return summary;
}

/**
 * Summaries for `ids` that are users of `orgId`, in `ids` order. No directory filter:
 * a saved steward always comes back to whoever may edit the badge.
 */
export async function getUserSummaries({
	orgId,
	ids,
	includeEmail
}: {
	orgId: string;
	ids: string[];
	includeEmail: boolean;
}): Promise<UserSummary[]> {
	const unique = [...new Set(ids)];
	if (unique.length === 0) return [];
	const rows = (await prisma.user.findMany({
		where: { organizationId: orgId, id: { in: unique } },
		select: userSummarySelect({ orgId, includeEmail })
	})) as SummaryRow[];
	const byId = new Map(rows.map((r) => [r.id, r]));
	return unique.flatMap((id) => {
		const row = byId.get(id);
		return row ? [toUserSummary(row, { includeEmail })] : [];
	});
}
