import type {
	Achievement,
	AchievementClaim,
	ClaimEndorsement,
	Identifier,
	Organization,
	User
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { error } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { sendOrcaMail } from '$lib/email/sendEmail';
import { renderOrcaEmail } from '$lib/email/template';
import * as m from '$lib/i18n/messages';
import { isAdmin } from '$lib/permissions/isAdmin';
import { notifyStewardsForReview, stewardIdsFor } from '$lib/server/stewards';
import { validateEmailAddress } from '$lib/utils/email';

import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

export const getAchievement = async (achievementId: string, orgId: string) => {
	const achievement = (await prisma.achievement.findFirstOrThrow({
		where: {
			id: achievementId,
			organizationId: orgId
		},
		include: {
			category: true,
			claimRequires: true,
			reviewRequires: true
		}
	})) as unknown; // Force application of the type including JSON fields.
	return achievement as App.AchievementWithRelations;
};

export interface InviteArgs {
	achievementId: string;
	org: Organization;
	inviteeEmail: string;
	json: Prisma.JsonObject | string;
	session: App.SessionData | null;
	emailIfNew?: boolean;
}

export const inviteToClaim = async ({
	achievementId,
	org,
	inviteeEmail,
	json,
	session,
	emailIfNew
}: InviteArgs): Promise<{
	status: 201;
	type: 'success';
	data: {
		created: boolean;
		invited: boolean;
		selfClaim: boolean;
		endorsement:
			| (ClaimEndorsement & { claim?: AchievementClaim })
			| { id: string; claim: AchievementClaim; inviteeEmail?: string; createdAt: Date };
		identifier: (Identifier & { user: User }) | null;
	};
}> => {
	const data: Prisma.ClaimEndorsementCreateInput = {
		achievement: { connect: { id: achievementId } },
		organization: { connect: { id: org.id } },
		inviteeEmail: inviteeEmail,
		json: json
	};

	if (!inviteeEmail) {
		error(400, {
			code: 'recipientEmail',
			message: m.sharp_ok_jackdaw_cook()
		});
	}
	if (!validateEmailAddress(inviteeEmail)) {
		error(400, m.sunny_grand_lemur_race());
	}

	const achievement = await getAchievement(achievementId, org.id);

	// UNAUTHENTICATED USERS: can create an invite for open-claim achievements only.
	if (!session?.user?.id && achievement.claimable && !achievement.claimRequiresId) {
		// achievement is claimable without any prerequisite. Unauthenticated
		// user will create a self-endorsement (with null creator) and then use it as an invite-code.
		const endorsement: ClaimEndorsement & { claim?: AchievementClaim } =
			await prisma.claimEndorsement.upsert({
				where: {
					creatorId_achievementId_inviteeEmail: {
						creatorId: '',
						achievementId: achievementId,
						inviteeEmail: inviteeEmail
					}
				},
				create: data,
				update: { json: data.json }
			});

		// This will always claim it's created, even if not. Attacker won't be able to tell that the account
		// predated their first request, they'll only be able to tell that it was at least created as of
		// *their* first request.
		return {
			status: 201,
			type: 'success',
			data: {
				created: true,
				invited: false,
				selfClaim: true,
				endorsement,
				identifier: null
			}
		};
	} else if (!session?.user?.id) {
		// Not an open claim achievement, and not authenticated.
		error(403, m.tiny_dark_ostrich_jump());
	}

	if (!isAdmin(session?.user) && !achievement.json?.capabilities?.inviteRequires) {
		// NON ADMIN USERS for a badge that is only inviteable by admins
		error(403, m.patchy_aqua_turtle_support());
	}

	if (
		!isAdmin(session?.user) &&
		session.user.id &&
		achievement.json?.capabilities?.inviteRequires
	) {
		const inviteQualificationClaim = await prisma.achievementClaim.findFirst({
			where: {
				achievementId: achievement.json?.capabilities?.inviteRequires,
				userId: session.user.id
			}
		});
		if (!inviteQualificationClaim || inviteQualificationClaim.validFrom === null) {
			error(403, m.tense_raw_cuckoo_dart());
		}
	}

	// ADMIN USERS and QUALIFIED INVITERS: May create claims for other users in unaccepted state.
	data.creator = { connect: { id: session.user.id } };

	const identifier = await prisma.identifier.findFirst({
		where: {
			identifier: data.inviteeEmail,
			organizationId: org.id
		},
		include: {
			user: true
		}
	});

	// If there is a member, ensure that there is an AchievementClaim
	if (identifier?.verifiedAt) {
		const isSelfClaim = session.user.id == identifier?.userId;

		// Ensure there is an existing claim for the identified member
		const claim = await prisma.achievementClaim.upsert({
			where: {
				userId_achievementId: {
					userId: identifier.userId,
					achievementId
				}
			},
			create: {
				user: { connect: { id: identifier.userId } },
				organization: { connect: { id: org.id } },
				achievement: { connect: { id: achievementId } },
				claimStatus: isSelfClaim ? 'ACCEPTED' : 'UNACCEPTED',
				// Snapshot the recipient's default, as self-claims do.
				visibility: identifier.user.defaultVisibility,

				// If the achievement requires review, the claim is not valid until reviewed.
				validFrom: !achievement.reviewRequiresId ? new Date() : null,
				creator: { connect: { id: session.user.id } },
				json: isSelfClaim ? data.json : '{}'
			},
			update: {}
		});

		// If the awarded claim needs review and the achievement has stewards, notify
		// them (throttled, so repeat awards don't re-spam). Skips the claimant.
		if (!claim.validFrom && stewardIdsFor(achievement).length) {
			await notifyStewardsForReview({
				achievement,
				org,
				achievementId,
				claimId: claim.id,
				claimantUserId: identifier.userId
			});
		}

		// Ensure there is an endorsement for this claim, on behalf of this admin, if not self-awarding
		let existingEndorsement: ClaimEndorsement | null = null;
		if (!isSelfClaim && emailIfNew) {
			existingEndorsement = await prisma.claimEndorsement.findFirst({
				where: {
					creatorId: session.user.id,
					achievementId,
					inviteeEmail
				}
			});
		}

		const endorsement = isSelfClaim
			? { id: '', claim, createdAt: new Date() }
			: await prisma.claimEndorsement.upsert({
					where: {
						creatorId_achievementId_inviteeEmail: {
							creatorId: session.user.id,
							inviteeEmail,
							achievementId
						}
					},
					create: { ...data, claim: { connect: { id: claim.id } } },
					update: { json: data.json }
				});

		// Notify user of claim
		if (!emailIfNew || !existingEndorsement) {
			const badgeUrl = `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/login?e=${encodeURIComponent(
				data.inviteeEmail
			)}&next=${encodeURIComponent('/claims/' + claim.id)}`;
			const awardedText = m.gentle_brave_falcon_awardeddesc({
				achievementName: achievement.name,
				communityName: org.name,
				badgeUrl
			});
			const emailResult = await sendOrcaMail({
				from: org.email,
				to: data.inviteeEmail,
				subject: m.warm_tangy_deer_awarded(),
				text: awardedText,
				html: renderOrcaEmail({
					org,
					title: m.warm_tangy_deer_awarded(),
					intro: awardedText.replace(badgeUrl, '').trim(),
					cta: { label: m.bright_swift_eagle_login(), url: badgeUrl }
				})
			});
			if (!emailResult.success) {
				error(500, m.moving_true_panther_delight({ message: emailResult.error?.message ?? '' }));
			}
		}

		return {
			status: 201,
			type: 'success',
			data: {
				created: emailIfNew && !isSelfClaim ? !existingEndorsement : true,
				invited: false,
				selfClaim: isSelfClaim,
				endorsement,
				identifier
			}
		};
	} else {
		// If there is not a member, create a claimEndorsement without a claim connected
		const existingEndorsement = emailIfNew
			? await prisma.claimEndorsement.findFirst({
					where: {
						creatorId: session.user.id,
						achievementId,
						inviteeEmail
					}
				})
			: null;

		const endorsement: ClaimEndorsement & { claim?: AchievementClaim; achievement?: Achievement } =
			await prisma.claimEndorsement.upsert({
				where: {
					creatorId_achievementId_inviteeEmail: {
						creatorId: session.user.id,
						inviteeEmail,
						achievementId
					}
				},
				create: data,
				update: { json: data.json }
			});

		// If there isn't already a user, we'll invite them to join by email
		if (!emailIfNew || !existingEndorsement) {
			const inviteLink = `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/achievements/${
				endorsement.achievementId
			}/claim?i=${endorsement.id}&e=${encodeURIComponent(data.inviteeEmail)}`;
			const inviteText = m.grand_lucky_kite_climb({
				achievementName: endorsement.achievement?.name ?? achievement.name,
				orgName: org.name,
				inviteLink
			});
			const emailResult = await sendOrcaMail({
				from: org.email,
				to: data.inviteeEmail,
				subject: m.male_active_turtle_view({ orgName: org.name }),
				text: inviteText,
				html: renderOrcaEmail({
					org,
					title: m.male_active_turtle_view({ orgName: org.name }),
					intro: inviteText.replace(inviteLink, '').trim(),
					cta: { label: m.bold_swift_eagle_claim(), url: inviteLink }
				})
			});
			if (!emailResult.success) {
				error(500, m.moving_true_panther_delight({ message: emailResult.error?.message ?? '' }));
			}
		}

		return {
			type: 'success',
			status: 201,
			data: {
				created: emailIfNew ? !existingEndorsement : true,
				invited: !identifier?.verifiedAt,
				selfClaim: false,
				endorsement,
				identifier
			}
		};
	}
};
