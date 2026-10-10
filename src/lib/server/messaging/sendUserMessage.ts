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
	/**
	 * Inbox-first messages (content reports): always record the Message row, since it is
	 * the only way to reach the item, and suppress or throttle only the email. Every
	 * call then writes a row, so the throttle uses a fixed window (at most one email per
	 * recipient per window) instead of a sliding one that would never reopen.
	 */
	alwaysRecord?: boolean;
}

export type SendUserMessageResult = 'sent' | 'suppressed_pref' | 'suppressed_throttle' | 'failed';

/**
 * Single entry point for user-directed messages. Checks the user's notification
 * preference, throttles per (org, user, type, achievement), sends the email, and logs a
 * `Message` row only on a successful send (or always, with `alwaysRecord`). Never throws
 * on a send failure — returns a discriminated result (the email outcome) so callers can
 * log-and-continue without breaking their flow.
 *
 * The Message id is generated up front so the email can link to its own detail page;
 * the row is then created with that explicit id.
 */
export async function sendUserMessage(args: SendUserMessageArgs): Promise<SendUserMessageResult> {
	// The id the Message row will use, generated up front so the email can deep-link to
	// `/messages/{id}` before the row exists.
	const messageId = uuidv4();
	const result = await sendEmailFor(args, messageId);

	// Record on a successful send; inbox-first messages are recorded regardless.
	if (result === 'sent' || args.alwaysRecord) {
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
	}
	return result;
}

async function sendEmailFor(
	args: SendUserMessageArgs,
	messageId: string
): Promise<SendUserMessageResult> {
	// 1. Preference: respect the user's email toggle (default on).
	if (!emailNotificationsEnabled(args.user.json)) return 'suppressed_pref';

	// 2. Throttle: skip if an equivalent message was logged within the window (sliding,
	//    or the current fixed window for inbox-first messages).
	const throttleMs = args.throttleMs ?? REVIEW_NOTIFY_THROTTLE_MS;
	const now = Date.now();
	const windowStart = args.alwaysRecord
		? Math.floor(now / throttleMs) * throttleMs
		: now - throttleMs;
	const recent = await prisma.message.findFirst({
		where: {
			organizationId: args.org.id,
			userId: args.user.id,
			type: args.type,
			achievementId: args.achievementId ?? null,
			createdAt: { gt: new Date(windowStart) }
		}
	});
	if (recent) return 'suppressed_throttle';

	// 3. Recipient: first verified EMAIL identifier.
	const to = args.user.identifiers.find(
		(i: Identifier) => i.type === 'EMAIL' && i.verifiedAt
	)?.identifier;
	if (!to) return 'failed';

	// 4. Build and send.
	const email = typeof args.email === 'function' ? args.email(messageId) : args.email;
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
	return result.success ? 'sent' : 'failed';
}
