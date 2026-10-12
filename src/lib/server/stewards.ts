import { MessageType, type Prisma } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { sendUserMessage } from '$lib/server/messaging/sendUserMessage';

import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

// Stewards are an additive overlay stored in `Achievement.json.stewards` (user IDs).
// They grant unilateral review authority — like an admin — on top of any base review
// rule. See ADR 2026-06-09-steward-review-and-messaging.

type HasJson = { json: Prisma.JsonValue };

export function stewardIdsFor(achievement: HasJson): string[] {
	const json = achievement.json;
	if (json && typeof json === 'object' && !Array.isArray(json)) {
		const stewards = (json as Prisma.JsonObject).stewards;
		if (Array.isArray(stewards)) {
			return stewards.filter((id): id is string => typeof id === 'string');
		}
	}
	return [];
}

export function isStewardUser(achievement: HasJson, userId: string | null | undefined): boolean {
	return !!userId && stewardIdsFor(achievement).includes(userId);
}

// Stewards that are still current org members (drops stale IDs). Includes the fields
// `sendUserMessage` needs (json for prefs, identifiers for the recipient address).
export async function currentStewardUsers(achievement: HasJson, orgId: string) {
	const ids = stewardIdsFor(achievement);
	if (!ids.length) return [];
	return prisma.user.findMany({
		where: { id: { in: ids }, organizationId: orgId },
		select: { id: true, json: true, identifiers: true }
	});
}

/**
 * Notify each current steward that a claim needs review (preference-aware, throttled
 * via `sendUserMessage`, member-filtered). Skips the claimant if they are themselves a
 * steward of their own claim. Never throws — a notification failure must not break the
 * claim flow.
 */
export async function notifyStewardsForReview(params: {
	achievement: HasJson & { name: string };
	org: {
		id: string;
		email: string;
		name: string;
		domain: string;
		primaryColor?: string | null;
		logo?: string | null;
	};
	achievementId: string;
	claimId: string;
	claimantUserId: string;
}): Promise<void> {
	const { achievement, org, achievementId, claimId, claimantUserId } = params;
	const stewards = await currentStewardUsers(achievement, org.id);
	const url = `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/claims/${claimId}/endorse`;

	for (const steward of stewards) {
		if (steward.id === claimantUserId) continue; // don't notify a steward about their own claim
		const intro = m.gentle_eager_finch_notify({ achievementName: achievement.name });
		try {
			await sendUserMessage({
				org,
				user: steward,
				type: MessageType.REVIEW_NEEDED,
				achievementId,
				claimId,
				email: {
					subject: m.noble_swift_otter_review(),
					title: m.bright_calm_heron_await(),
					intro,
					cta: { label: m.quick_warm_robin_open(), url },
					text: `${intro}\n\n${url}`
				}
			});
		} catch (e) {
			console.error('steward review notification failed', e);
		}
	}
}
