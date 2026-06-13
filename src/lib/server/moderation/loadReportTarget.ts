import type { ReportTargetType } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';

// SINGLE AUDITED PLACE for moderation target reads that are NOT scoped to the
// viewer's `locals.org`. Every query here is scoped to `report.originOrgId` — the
// origin org derived from the Report row itself, NEVER from a query param or any
// other client input. The detail-page load is responsible for the access checks
// (Message capability binding + `requireSuperadminOrg` for cross-org); this helper
// only performs the origin-org-scoped content read once that gate has passed.

/** A normalized, read-only view of the reported content. */
export interface ReportTargetView {
	targetType: ReportTargetType;
	targetId: string;
	/** Whether the underlying content row still exists in the origin org. */
	found: boolean;
	/** Short human title for the content (achievement name, claim/endorsement label). */
	title: string | null;
	/** Longer body text where available (e.g. achievement description). */
	body: string | null;
	/** Optional image url (achievements). */
	image: string | null;
	/** Display name of the subject user for claims, when available. */
	subjectName: string | null;
	/** Invitee email for endorsement invitations, when available. */
	inviteeEmail: string | null;
}

/** The minimal Report shape this helper needs. Origin org comes from the row. */
export interface ReportLike {
	originOrgId: string;
	targetType: ReportTargetType;
	targetId: string;
}

function fullName(
	user: { givenName: string | null; familyName: string | null } | null
): string | null {
	if (!user) return null;
	const name = [user.givenName, user.familyName].filter(Boolean).join(' ').trim();
	return name || null;
}

/**
 * Load the reported content for `report`, scoped to `report.originOrgId`. Returns a
 * normalized, read-only view-model. Cross-org reads (origin org !== viewer's org) are
 * logged for audit. Access control is the caller's responsibility — see the file
 * header.
 */
export async function loadReportTarget(
	report: ReportLike,
	opts?: { viewerOrgId?: string }
): Promise<ReportTargetView> {
	const { originOrgId, targetType, targetId } = report;

	// Audit: a cross-org content read (superadmin viewing an origin-org report).
	if (opts?.viewerOrgId && opts.viewerOrgId !== originOrgId) {
		console.info('moderation cross-org target read', {
			viewerOrgId: opts.viewerOrgId,
			originOrgId,
			targetType,
			targetId
		});
	}

	const base: ReportTargetView = {
		targetType,
		targetId,
		found: false,
		title: null,
		body: null,
		image: null,
		subjectName: null,
		inviteeEmail: null
	};

	// Every query is scoped to the origin org id from the report row.
	switch (targetType) {
		case 'ACHIEVEMENT': {
			const a = await prisma.achievement.findFirst({
				where: { id: targetId, organizationId: originOrgId },
				select: { id: true, name: true, description: true, image: true }
			});
			if (!a) return base;
			return { ...base, found: true, title: a.name, body: a.description, image: a.image };
		}
		case 'CLAIM': {
			const c = await prisma.achievementClaim.findFirst({
				where: { id: targetId, organizationId: originOrgId },
				select: {
					id: true,
					achievement: { select: { name: true, description: true, image: true } },
					user: { select: { givenName: true, familyName: true } }
				}
			});
			if (!c) return base;
			return {
				...base,
				found: true,
				title: c.achievement?.name ?? null,
				body: c.achievement?.description ?? null,
				image: c.achievement?.image ?? null,
				subjectName: fullName(c.user)
			};
		}
		case 'ENDORSEMENT': {
			const e = await prisma.claimEndorsement.findFirst({
				where: { id: targetId, organizationId: originOrgId },
				select: {
					id: true,
					inviteeEmail: true,
					achievement: { select: { name: true, description: true, image: true } }
				}
			});
			if (!e) return base;
			return {
				...base,
				found: true,
				title: e.achievement?.name ?? null,
				body: e.achievement?.description ?? null,
				image: e.achievement?.image ?? null,
				inviteeEmail: e.inviteeEmail
			};
		}
		default:
			return base;
	}
}
