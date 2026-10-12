import type { ModerationTier, ReportTargetType } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';

// Suspension read + tier-authority logic. Enforcement across read paths is wired in P5;
// these are the shared primitives (single source of truth for "is this suspended" and
// "may this actor lift this suspension").

export interface ContentTarget {
	originOrgId: string;
	targetType: ReportTargetType;
	targetId: string;
}

export interface ActiveSuspension {
	actionId: string;
	tier: ModerationTier; // effective tier (SITE outranks ORG)
	createdAt: Date;
}

/** SITE outranks ORG. */
export function tierRank(tier: ModerationTier): number {
	return tier === 'SITE' ? 1 : 0;
}

/**
 * An ORG-tier actor may lift only ORG suspensions; a SITE-tier actor (superadmin) may
 * lift ORG or SITE. So: an org admin can NEVER override a SITE suspension.
 */
export function canLift(actorTier: ModerationTier, suspensionTier: ModerationTier): boolean {
	return tierRank(actorTier) >= tierRank(suspensionTier);
}

/**
 * The active (unlifted) suspension for a target, or null. When both an ORG and a SITE
 * suspension are active, the SITE one is returned (it governs lift authority).
 */
export async function activeSuspensionFor(target: ContentTarget): Promise<ActiveSuspension | null> {
	const rows = await prisma.moderationAction.findMany({
		where: {
			originOrgId: target.originOrgId,
			targetType: target.targetType,
			targetId: target.targetId,
			action: 'SUSPEND',
			liftedAt: null
		},
		select: { id: true, tier: true, createdAt: true }
	});
	if (!rows.length) return null;
	const governing = rows.reduce((best, r) => (tierRank(r.tier) > tierRank(best.tier) ? r : best));
	return { actionId: governing.id, tier: governing.tier, createdAt: governing.createdAt };
}

/**
 * Batched variant for lists (avoids N+1): returns a Map keyed by `${targetType}:${targetId}`
 * to the governing active suspension. Pass targets that share one origin org.
 */
export async function activeSuspensionsFor(
	originOrgId: string,
	targets: Array<{ targetType: ReportTargetType; targetId: string }>
): Promise<Map<string, ActiveSuspension>> {
	const out = new Map<string, ActiveSuspension>();
	if (!targets.length) return out;
	const ids = [...new Set(targets.map((t) => t.targetId))];
	const rows = await prisma.moderationAction.findMany({
		where: {
			originOrgId,
			targetId: { in: ids },
			action: 'SUSPEND',
			liftedAt: null
		},
		select: { id: true, tier: true, createdAt: true, targetType: true, targetId: true }
	});
	for (const r of rows) {
		const key = `${r.targetType}:${r.targetId}`;
		const prev = out.get(key);
		if (!prev || tierRank(r.tier) > tierRank(prev.tier)) {
			out.set(key, { actionId: r.id, tier: r.tier, createdAt: r.createdAt });
		}
	}
	return out;
}

export async function isSuspended(target: ContentTarget): Promise<boolean> {
	return (await activeSuspensionFor(target)) !== null;
}

// ---------------------------------------------------------------------------
// P5 enforcement helpers. The read paths (achievement/claim/endorsement detail,
// lists, claim/credential issuance) reuse these so the "suspended → hidden for
// non-admins / flagged for admins / blocked for issuance" rule lives in ONE place.
// ---------------------------------------------------------------------------

/** A target's visibility decision for a given viewer class. */
export interface SuspensionState {
	/** The governing active suspension, or null when not suspended. */
	suspension: ActiveSuspension | null;
	/** True when the content is suspended (any active tier). */
	suspended: boolean;
	/** True when the viewer must NOT see the content (suspended AND not an admin). */
	hidden: boolean;
}

/**
 * Resolve the suspension state of a single target for a viewer. When the viewer is
 * an admin they see the content with a flag (`suspended` true, `hidden` false);
 * non-admins are told to treat it as removed (`hidden` true).
 *
 * `viewerIsAdmin` lets owners/admins be passed through where the caller already
 * decided the viewer may see suspended content (e.g. a claim owner). The single
 * source of truth for "is this suspended" stays `activeSuspensionFor`.
 */
export async function suspensionStateFor(
	target: ContentTarget,
	viewerIsAdmin: boolean
): Promise<SuspensionState> {
	const suspension = await activeSuspensionFor(target);
	const suspended = suspension !== null;
	return { suspension, suspended, hidden: suspended && !viewerIsAdmin };
}

/** A list item annotated with whether the current viewer should see it and a flag. */
export interface AnnotatedItem<T> {
	item: T;
	suspension: ActiveSuspension | null;
	suspended: boolean;
}

/**
 * Batched list annotation (no N+1): one `activeSuspensionsFor` query for the whole
 * page. Returns each item paired with its governing suspension. Use `.filter` on the
 * result for non-admins (drop `suspended` items) or keep all + flag for admins.
 */
export async function annotateSuspensions<T>(
	originOrgId: string,
	items: T[],
	pick: (item: T) => { targetType: ReportTargetType; targetId: string }
): Promise<Array<AnnotatedItem<T>>> {
	const targets = items.map(pick);
	const map = await activeSuspensionsFor(originOrgId, targets);
	return items.map((item) => {
		const { targetType, targetId } = pick(item);
		const suspension = map.get(`${targetType}:${targetId}`) ?? null;
		return { item, suspension, suspended: suspension !== null };
	});
}
