import { ReportTargetType } from '@prisma/client';
import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { notifyReport } from '$lib/server/moderation/notifyReport';
import { computeReporterStatus } from '$lib/server/moderation/reporterStatus';
import stripTags from '$lib/utils/stripTags';

import type { RequestHandler } from './$types';

const VALID_TARGET_TYPES = Object.values(ReportTargetType) as string[];

/**
 * Confirm the reported target exists and belongs to `orgId`. Each content type
 * is org-scoped by `organizationId`, so a target from another org is treated as
 * not found (cross-org safe).
 */
async function targetExistsInOrg(
	targetType: ReportTargetType,
	targetId: string,
	orgId: string
): Promise<boolean> {
	const where = { id: targetId, organizationId: orgId };
	switch (targetType) {
		case 'ACHIEVEMENT':
			return (await prisma.achievement.findFirst({ where, select: { id: true } })) !== null;
		case 'CLAIM':
			return (await prisma.achievementClaim.findFirst({ where, select: { id: true } })) !== null;
		case 'ENDORSEMENT':
			return (await prisma.claimEndorsement.findFirst({ where, select: { id: true } })) !== null;
		default:
			return false;
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const org = locals.org;
	if (!org?.id) error(404, 'Not found');

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, 'Invalid request body');

	const { targetType, targetId, reason, description } = body as {
		targetType?: unknown;
		targetId?: unknown;
		reason?: unknown;
		description?: unknown;
	};

	// Validate the target type against the Prisma enum.
	if (typeof targetType !== 'string' || !VALID_TARGET_TYPES.includes(targetType)) {
		error(400, 'Invalid targetType');
	}
	if (typeof targetId !== 'string' || !targetId) error(400, 'Missing targetId');
	if (typeof reason !== 'string' || !reason) error(400, 'Missing reason');

	const typedTargetType = targetType as ReportTargetType;

	// Org-scoped target lookup: reject (404) a target from another org or one
	// that does not exist.
	if (!(await targetExistsInOrg(typedTargetType, targetId, org.id))) {
		error(404, 'Target not found');
	}

	// Reporter identity/status is derived server-side from the session — never
	// trusted from the client. Anonymous reporters are allowed.
	const reporterStatus = await computeReporterStatus({ session: locals.session, org });
	const reporterUserId = locals.session?.user?.id ?? null;

	const cleanReason = stripTags(reason);
	const cleanDescription =
		typeof description === 'string' && description.length ? stripTags(description) : null;

	const report = await prisma.report.create({
		data: {
			originOrgId: org.id,
			targetType: typedTargetType,
			targetId,
			reporterUserId,
			reporterStatus,
			reason: cleanReason,
			description: cleanDescription
		},
		select: { id: true, originOrgId: true }
	});

	// Fan out a Message + throttled email to origin-org admins and, when configured,
	// superadmin-org admins. Fire-and-forget: `notifyReport` never throws (it catches
	// per recipient), so awaiting it cannot abort the submit response.
	await notifyReport({ report, originOrg: org });

	return json({ ok: true, reportId: report.id });
};
