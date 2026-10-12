import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { loadReportTarget } from '$lib/server/moderation/loadReportTarget';
import { isSuperadminOrg, requireSuperadminOrg } from '$lib/server/moderation/superadminOrg';
import { liftTarget, suspendTarget } from '$lib/server/moderation/suspendActions';
import { activeSuspensionFor } from '$lib/server/moderation/suspension';

import type { PageServerLoad } from './$types';

// Re-do the P4 trust chain for a write action: the message must be the viewer's OWN row
// in the current org (capability binding), and the origin org is ALWAYS derived from the
// report row — never client input. Cross-org actions additionally require the
// fail-closed superadmin guard. Returns the bound target on success.
async function bindActionTarget(messageId: string, locals: App.Locals) {
	const me = locals.session?.user?.id;
	if (!me) error(401, 'Unauthorized');

	const message = await prisma.message.findFirst({
		where: { id: messageId, userId: me, organizationId: locals.org.id },
		include: { report: true }
	});
	if (!message || !message.report) error(404, 'Not found');

	const report = message.report;
	const originOrgId = report.originOrgId;
	const sameOrg = originOrgId === locals.org.id;

	// Cross-org actions are only for the superadmin org and fail closed otherwise.
	if (!sameOrg) requireSuperadminOrg(locals);

	return {
		me,
		actorOrgId: locals.org.id,
		target: { originOrgId, targetType: report.targetType, targetId: report.targetId }
	};
}

// SECURITY-CRITICAL load. See the phase spec (P4). The trust chain is:
//   1. Capability binding: the message must be the viewer's OWN row IN THE CURRENT
//      ORG (findFirst by id + userId + organizationId). 404 otherwise. A user can only
//      reach a report through a Message addressed to them in their current org.
//   2. Read mode:
//        - same-org (report.originOrgId === locals.org.id): org-admin reading context.
//          NEVER select reporter identity — only the snapshotted reporterStatus.
//        - cross-org (report.originOrgId !== locals.org.id): superadmin reading
//          context. Guarded by requireSuperadminOrg(locals), which FAILS CLOSED (403)
//          when SUPERADMIN_ORG_ID is unset or the viewer's org is not the superadmin
//          org. Only here may reporter identity be loaded.
//   3. The origin org is ALWAYS report.originOrgId (from the row) — never a query
//      param or any client input. All target reads are scoped to that origin org.
export const load: PageServerLoad = async ({ params, locals }) => {
	const me = locals.session?.user?.id;
	if (!me) redirect(302, '/');

	// (1) Capability binding — your message, this org, or 404.
	const message = await prisma.message.findFirst({
		where: { id: params.id, userId: me, organizationId: locals.org.id },
		include: { report: true }
	});
	if (!message) error(404, 'Not found');

	// Non-report message (e.g. a future REVIEW_NEEDED without a report): render minimally.
	const report = message.report;
	if (!report) {
		return {
			message: { id: message.id, type: message.type, createdAt: message.createdAt },
			report: null,
			target: null,
			suspension: null,
			viewerActorTier: 'ORG' as const,
			viewerCanLift: false,
			viewerIsSuperadmin: false,
			reporterIdentity: null
		};
	}

	// Origin org is derived from the report row, never from input.
	const originOrgId = report.originOrgId;
	const sameOrg = originOrgId === locals.org.id;

	// reporterIdentity is loaded ONLY in the cross-org (superadmin) branch below.
	let reporterIdentity: { id: string; name: string | null } | null = null;
	let viewerIsSuperadmin = false;

	if (sameOrg) {
		// (2a) Same-org org-admin read. Reporter identity is intentionally NOT loaded.
		// The sanitized `report` returned below omits reporterUserId entirely.
	} else {
		// (2b) Cross-org superadmin read. FAIL CLOSED: throws 403 unless the viewer's
		// current org IS the configured superadmin org (and the env is set).
		requireSuperadminOrg(locals);
		viewerIsSuperadmin = true;

		// Only now — superadmin-org viewer — may we load reporter identity. Scoped to
		// the origin org from the report row.
		if (report.reporterUserId) {
			const reporter = await prisma.user.findFirst({
				where: { id: report.reporterUserId, organizationId: originOrgId },
				select: { id: true, givenName: true, familyName: true }
			});
			if (reporter) {
				const name = [reporter.givenName, reporter.familyName].filter(Boolean).join(' ').trim();
				reporterIdentity = { id: reporter.id, name: name || null };
			}
		}
	}

	// (3) Target read — origin-org-scoped, in the single audited helper.
	const target = await loadReportTarget(
		{ originOrgId, targetType: report.targetType, targetId: report.targetId },
		{ viewerOrgId: locals.org.id }
	);

	const suspension = await activeSuspensionFor({
		originOrgId,
		targetType: report.targetType,
		targetId: report.targetId
	});

	// The viewer acts at SITE tier iff they are in the superadmin org (cross-org), else
	// ORG. An ORG actor cannot lift a SITE suspension (mirrors `canLift`); the UI uses
	// `viewerCanLift` to show "cannot override" instead of a Lift button.
	const viewerActorTier: 'ORG' | 'SITE' = isSuperadminOrg(locals.org.id) ? 'SITE' : 'ORG';
	const viewerCanLift = suspension
		? viewerActorTier === 'SITE' || suspension.tier === 'ORG'
		: false;

	// Sanitized report: reporterUserId and the reporter relation are NEVER returned.
	// Reporter identity (when present) is gated through the superadmin-only
	// `reporterIdentity` field above.
	const sanitizedReport = {
		id: report.id,
		targetType: report.targetType,
		reporterStatus: report.reporterStatus,
		reason: report.reason,
		description: report.description,
		createdAt: report.createdAt,
		isCrossOrg: !sameOrg
	};

	return {
		message: { id: message.id, type: message.type, createdAt: message.createdAt },
		report: sanitizedReport,
		target,
		suspension,
		viewerActorTier,
		viewerCanLift,
		viewerIsSuperadmin,
		reporterIdentity
	};
};

export const actions: Actions = {
	suspend: async ({ params, locals, request }) => {
		const { me, actorOrgId, target } = await bindActionTarget(params.id, locals);
		const formData = await request.formData();
		const reason = formData.get('reason')?.toString();

		const outcome = await suspendTarget({
			target,
			actorUserId: me,
			actorOrgId,
			reason
		});

		if (!outcome.ok) {
			// Org-tier actor attempted to act on another org's content (should be
			// unreachable behind the binding, but fail closed).
			return fail(403, { action: 'suspend', message: m.stern_lone_bison_guard() });
		}
		return { action: 'suspend', status: outcome.status, tier: outcome.tier };
	},

	lift: async ({ params, locals }) => {
		const { me, actorOrgId, target } = await bindActionTarget(params.id, locals);

		const outcome = await liftTarget({ target, actorUserId: me, actorOrgId });

		if (!outcome.ok) {
			// An ORG actor tried to lift a SITE suspension — server-enforced rejection.
			return fail(403, { action: 'lift', message: m.grave_high_falcon_hold() });
		}
		return { action: 'lift', status: outcome.status };
	}
};
