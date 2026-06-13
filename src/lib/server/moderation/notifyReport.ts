import { MessageType } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { REPORT_NOTIFY_THROTTLE_MS } from '$lib/server/messaging/constants';
import { sendUserMessage, type SendUserMessageEmail } from '$lib/server/messaging/sendUserMessage';
import { superadminOrgId } from '$lib/server/moderation/superadminOrg';

import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

// The org fields `sendUserMessage` needs, plus `domain` for the recipient-org link.
type NotifyOrg = {
	id: string;
	email: string;
	name: string;
	domain: string;
	primaryColor?: string | null;
	logo?: string | null;
};

/**
 * Build the report-notification email for a single recipient. The CTA links to the
 * recipient's OWN org domain (`recipientOrg.domain`) message detail — superadmin-org
 * admins read the report in their own inbox, origin-org admins in theirs.
 */
function buildReportEmail(params: {
	recipientOrg: NotifyOrg;
	messageId: string;
}): SendUserMessageEmail {
	const { recipientOrg, messageId } = params;
	const url = `${PUBLIC_HTTP_PROTOCOL}://${recipientOrg.domain}/messages/${messageId}`;
	const intro = m.brisk_lush_otter_flag();
	return {
		subject: m.noble_swift_finch_notice(),
		title: m.mellow_keen_heron_alert(),
		intro,
		cta: { label: m.quick_bold_robin_view(), url },
		text: `${intro}\n\n${url}`
	};
}

const ADMIN_ROLES = ['GENERAL_ADMIN', 'CONTENT_ADMIN'] as const;

/**
 * Fan out a `CONTENT_REPORTED` Message (+ throttled email) to every admin who should
 * see a new report: the origin org's admins (reading context = origin org) and, when
 * configured, the superadmin org's admins (reading context = superadmin org). The
 * `reportId` carries the cross-org pointer; `report.originOrgId` is the origin.
 *
 * Fail closed: if `SUPERADMIN_ORG_ID` is unset (or equals the origin org), the
 * superadmin fan-out is skipped — origin-org admins are still notified. Never throws:
 * each recipient is caught/logged independently (mirrors `notifyStewardsForReview`).
 */
export async function notifyReport(args: {
	report: { id: string; originOrgId: string };
	originOrg: NotifyOrg;
}): Promise<void> {
	const { report, originOrg } = args;

	// 1) Origin-org admins → reading context = origin org.
	await fanOut({ recipientOrg: originOrg, reportId: report.id });

	// 2) Superadmin-org admins → reading context = the superadmin org (a different org).
	const superId = superadminOrgId();
	if (superId && superId !== originOrg.id) {
		const superOrg = await prisma.organization.findUnique({ where: { id: superId } });
		if (superOrg) {
			await fanOut({ recipientOrg: superOrg, reportId: report.id });
		}
	}
}

/** Notify every admin of `recipientOrg` about `reportId` (reading context = that org). */
async function fanOut(params: { recipientOrg: NotifyOrg; reportId: string }): Promise<void> {
	const { recipientOrg, reportId } = params;
	const admins = await prisma.user.findMany({
		where: { organizationId: recipientOrg.id, orgRole: { in: [...ADMIN_ROLES] } },
		select: { id: true, json: true, identifiers: true }
	});

	for (const admin of admins) {
		try {
			await sendUserMessage({
				org: recipientOrg,
				user: admin,
				type: MessageType.CONTENT_REPORTED,
				reportId,
				throttleMs: REPORT_NOTIFY_THROTTLE_MS,
				email: (messageId) => buildReportEmail({ recipientOrg, messageId })
			});
			// Audit: log each fan-out (recipient org + user + report).
			console.info('report notification fan-out', {
				orgId: recipientOrg.id,
				userId: admin.id,
				reportId
			});
		} catch (e) {
			console.error(
				'report notification failed',
				{ orgId: recipientOrg.id, userId: admin.id, reportId },
				e
			);
		}
	}
}
