import type { Identifier, MessageType, Prisma } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';
import { sendOrcaMail } from '$lib/email/sendEmail';
import { renderOrcaEmail } from '$lib/email/template';
import { emailNotificationsEnabled } from '$lib/server/notificationPrefs';


import { REVIEW_NOTIFY_THROTTLE_MS } from './constants';

export interface SendUserMessageArgs {
	org: {
		id: string;
		email: string;
		name: string;
		primaryColor?: string | null;
		logo?: string | null;
	};
	user: { id: string; json: Prisma.JsonValue; identifiers: Identifier[] };
	type: MessageType;
	achievementId?: string;
	claimId?: string;
	email: {
		subject: string;
		title: string;
		intro?: string;
		cta?: { label: string; url: string };
		text: string;
	};
	throttleMs?: number; // defaults to the review-notify window
}

export type SendUserMessageResult = 'sent' | 'suppressed_pref' | 'suppressed_throttle' | 'failed';

/**
 * Single entry point for user-directed messages. Checks the user's notification
 * preference, throttles per (user, type, achievement), sends the email, and logs a
 * `Message` row only on a successful send. Never throws on a send failure — returns
 * a discriminated result so callers can log-and-continue without breaking their flow.
 */
export async function sendUserMessage(args: SendUserMessageArgs): Promise<SendUserMessageResult> {
	// 1. Preference: respect the user's email toggle (default on). No send, no record.
	if (!emailNotificationsEnabled(args.user.json)) return 'suppressed_pref';

	// 2. Throttle: skip if an equivalent message was logged within the window.
	const throttleMs = args.throttleMs ?? REVIEW_NOTIFY_THROTTLE_MS;
	const recent = await prisma.message.findFirst({
		where: {
			organizationId: args.org.id,
			userId: args.user.id,
			type: args.type,
			achievementId: args.achievementId ?? null,
			createdAt: { gt: new Date(Date.now() - throttleMs) }
		}
	});
	if (recent) return 'suppressed_throttle';

	// 3. Recipient: first verified EMAIL identifier.
	const to = args.user.identifiers.find(
		(i: Identifier) => i.type === 'EMAIL' && i.verifiedAt
	)?.identifier;
	if (!to) return 'failed';

	// 4. Send.
	const result = await sendOrcaMail({
		from: args.org.email,
		to,
		subject: args.email.subject,
		text: args.email.text,
		html: renderOrcaEmail({
			org: args.org,
			title: args.email.title,
			intro: args.email.intro,
			cta: args.email.cta
		})
	});
	if (!result.success) return 'failed'; // no Message row on failure

	// 5. Record (only on success).
	await prisma.message.create({
		data: {
			organizationId: args.org.id,
			userId: args.user.id,
			type: args.type,
			achievementId: args.achievementId,
			claimId: args.claimId
		}
	});
	return 'sent';
}
