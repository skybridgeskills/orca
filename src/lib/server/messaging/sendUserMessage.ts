import type { Identifier, MessageType, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '$lib/../prisma/client';
import { sendOrcaMail } from '$lib/email/sendEmail';
import { renderOrcaEmail } from '$lib/email/template';
import { emailNotificationsEnabled } from '$lib/server/notificationPrefs';

import { REVIEW_NOTIFY_THROTTLE_MS } from './constants';

export interface SendUserMessageEmail {
	subject: string;
	title: string;
	intro?: string;
	cta?: { label: string; url: string };
	text: string;
}

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
	reportId?: string;
	/**
	 * The email to send. Either a ready-built object, or a builder that receives the
	 * id the Message row will be created with — so the email can deep-link to
	 * `/messages/{messageId}` (the row is created with this same id on success).
	 */
	email: SendUserMessageEmail | ((messageId: string) => SendUserMessageEmail);
	throttleMs?: number; // defaults to the review-notify window
}

export type SendUserMessageResult = 'sent' | 'suppressed_pref' | 'suppressed_throttle' | 'failed';

/**
 * Single entry point for user-directed messages. Checks the user's notification
 * preference, throttles per (org, user, type, achievement), sends the email, and logs a
 * `Message` row only on a successful send. Never throws on a send failure — returns
 * a discriminated result so callers can log-and-continue without breaking their flow.
 *
 * The Message id is generated up front so the email can link to its own detail page;
 * the row is then created with that explicit id (only on a successful send).
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

	// 4. Build the email. Generate the id the Message row will use up front so a
	//    builder can deep-link to `/messages/{id}` before the row exists.
	const messageId = uuidv4();
	const email = typeof args.email === 'function' ? args.email(messageId) : args.email;

	// 5. Send.
	const result = await sendOrcaMail({
		from: args.org.email,
		to,
		subject: email.subject,
		text: email.text,
		html: renderOrcaEmail({
			org: args.org,
			title: email.title,
			intro: email.intro,
			cta: email.cta
		})
	});
	if (!result.success) return 'failed'; // no Message row on failure

	// 6. Record (only on success), with the same id the email linked to.
	await prisma.message.create({
		data: {
			id: messageId,
			organizationId: args.org.id,
			userId: args.user.id,
			type: args.type,
			achievementId: args.achievementId,
			claimId: args.claimId,
			reportId: args.reportId
		}
	});
	return 'sent';
}
