import type { ModerationTier, ReportTargetType } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';

import { isSuperadminOrg } from './superadminOrg';
import { activeSuspensionFor, canLift, tierRank, type ContentTarget } from './suspension';

// P5 suspend/lift orchestration. Authority logic (tier comparison) lives in the P1
// helpers (`canLift`, `tierRank`); this module turns a request into a `ModerationAction`
// write while enforcing idempotency and lift-authority. The CALLER (the message detail
// action) is responsible for the capability binding (the viewer's own Message row) and
// the cross-org `requireSuperadminOrg` guard. Origin org is always derived from the
// report row, never client input.

/** The actor's tier is SITE iff they act from the configured superadmin org, else ORG. */
export function actorTierFor(actorOrgId: string): ModerationTier {
	return isSuperadminOrg(actorOrgId) ? 'SITE' : 'ORG';
}

export type SuspendOutcome =
	| { ok: true; status: 'created'; tier: ModerationTier; actionId: string }
	| { ok: true; status: 'noop'; tier: ModerationTier; reason: 'already-suspended' }
	| { ok: false; reason: 'cross-org-forbidden' };

export type LiftOutcome =
	| { ok: true; status: 'lifted'; actionId: string }
	| { ok: true; status: 'noop'; reason: 'not-suspended' }
	| { ok: false; reason: 'insufficient-tier'; suspensionTier: ModerationTier };

/**
 * Suspend `target`. `tier` is derived from the actor's org (SITE for the superadmin
 * org, ORG otherwise). Org admins may only suspend their OWN org's content (same-org);
 * superadmins may suspend cross-org (the caller must have passed `requireSuperadminOrg`
 * + the Message capability first). Idempotent: a no-op when an active suspension at the
 * same-or-higher tier already exists; a SITE suspend is allowed when only an ORG one is
 * active (it supersedes by governing lift authority — we don't stack same-tier rows).
 */
export async function suspendTarget(opts: {
	target: ContentTarget;
	actorUserId: string;
	actorOrgId: string;
	reason?: string | null;
}): Promise<SuspendOutcome> {
	const { target, actorUserId, actorOrgId, reason } = opts;
	const tier = actorTierFor(actorOrgId);
	const sameOrg = actorOrgId === target.originOrgId;

	// Org-tier actors may only act on their own org's content. SITE actors (superadmin
	// org) reach here only after the caller's requireSuperadminOrg guard, so cross-org
	// is permitted for them.
	if (tier === 'ORG' && !sameOrg) {
		return { ok: false, reason: 'cross-org-forbidden' };
	}

	const existing = await activeSuspensionFor(target);
	if (existing && tierRank(existing.tier) >= tierRank(tier)) {
		// Same-or-higher tier already active → don't stack.
		return { ok: true, status: 'noop', tier, reason: 'already-suspended' };
	}

	const created = await prisma.moderationAction.create({
		data: {
			originOrgId: target.originOrgId,
			targetType: target.targetType,
			targetId: target.targetId,
			action: 'SUSPEND',
			tier,
			actorUserId,
			actorOrgId,
			reason: reason?.trim() || null
		},
		select: { id: true }
	});

	console.info('moderation suspend', {
		actionId: created.id,
		originOrgId: target.originOrgId,
		targetType: target.targetType,
		targetId: target.targetId,
		tier,
		actorUserId,
		actorOrgId,
		supersededTier: existing?.tier ?? null
	});

	return { ok: true, status: 'created', tier, actionId: created.id };
}

/**
 * Lift the active suspension on `target`. Only succeeds when the actor's tier outranks
 * or equals the suspension's tier (`canLift`): an ORG actor CANNOT lift a SITE
 * suspension. Sets `liftedAt`/`liftedByUserId`/`liftedTier` on the governing action.
 */
export async function liftTarget(opts: {
	target: ContentTarget;
	actorUserId: string;
	actorOrgId: string;
}): Promise<LiftOutcome> {
	const { target, actorUserId, actorOrgId } = opts;
	const actorTier = actorTierFor(actorOrgId);

	const active = await activeSuspensionFor(target);
	if (!active) return { ok: true, status: 'noop', reason: 'not-suspended' };

	if (!canLift(actorTier, active.tier)) {
		return { ok: false, reason: 'insufficient-tier', suspensionTier: active.tier };
	}

	await prisma.moderationAction.update({
		where: { id: active.actionId },
		data: { liftedAt: new Date(), liftedByUserId: actorUserId, liftedTier: actorTier }
	});

	console.info('moderation lift', {
		actionId: active.actionId,
		originOrgId: target.originOrgId,
		targetType: target.targetType,
		targetId: target.targetId,
		suspensionTier: active.tier,
		actorTier,
		actorUserId,
		actorOrgId
	});

	return { ok: true, status: 'lifted', actionId: active.actionId };
}

export type { ReportTargetType };
