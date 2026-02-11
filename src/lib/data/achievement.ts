import * as m from '$lib/i18n/messages';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import type {
	Achievement,
	AchievementClaim,
	ClaimEndorsement,
	Identifier,
	Organization,
	User
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { sendOrcaMail } from '$lib/email/sendEmail';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
import { validateEmailAddress } from '$lib/utils/email';
import { isAdmin } from '$lib/permissions/isAdmin';

export const getAchievement = async (achievementId: string, orgId: string) => {
	const achievement = (await prisma.achievement.findFirstOrThrow({
		where: {
			id: achievementId,
			organizationId: orgId
		},
		include: {
			category: true,
			achievementConfig: {
				include: { claimRequires: true, reviewRequires: true }
			}
		}
	})) as unknown; // Force application of the type including JSON fields.
	return achievement as Achievement & {
		achievementConfig?: App.AchievementConfig & {
			claimRequires?: Achievement;
			reviewRequires?: Achievement;
		};
	};
};

export interface InviteArgs {
	achievementId: string;
	org: Organization;
	inviteeEmail: string;
	json: Prisma.JsonObject | string;
	session: App.SessionData | null;
}

export const inviteToClaim = async ({
	achievementId,
	org,
	inviteeEmail,
	json,
	session
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
		throw error(400, {
			code: 'recipientEmail',
			message: m.invite_recipientIdentifierRequiredError()
		});
	}
	if (!validateEmailAddress(inviteeEmail)) {
		throw error(400, m.sunny_grand_lemur_race());
	}

	const achievement = await getAchievement(achievementId, org.id);
	const achievementConfig = achievement.achievementConfig;

	// UNAUTHENTICATED USERS: can create an invite for open-claim achievements only.
	if (
		!session?.user?.id &&
		achievement.achievementConfig?.claimable &&
		!achievement?.achievementConfig?.claimRequiresId
	) {
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
				update: {}
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
		throw error(403, m.invite_achievementUnauthorizedError());
	}

	if (!isAdmin({ user: session?.user }) && !achievementConfig?.json?.capabilities?.inviteRequires) {
		// NON ADMIN USERS for a badge that is only inviteable by admins
		throw error(403, m.invite_unauthorizedNonAdminError());
	}

	if (
		!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(session?.user?.orgRole || 'none') &&
		session.user.id &&
		achievementConfig?.json?.capabilities?.inviteRequires
	) {
		const inviteQualificationClaim = await prisma.achievementClaim.findFirst({
			where: {
				achievementId: achievementConfig?.json?.capabilities?.inviteRequires,
				userId: session.user.id
			}
		});
		if (!inviteQualificationClaim || inviteQualificationClaim.validFrom === null) {
			throw error(403, m.tense_raw_cuckoo_dart());
		}
	}

	// ADMIN USERS and QUALIFIED INVITERS: May create claims for other users in unaccepted state.
	data.creator = { connect: { id: session.user.id } };

	let identifier = await prisma.identifier.findFirst({
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

				// If the achievement requires review, the claim is not valid until reviewed.
				validFrom: !achievement.achievementConfig?.reviewRequiresId ? new Date() : null,
				creator: { connect: { id: session.user.id } },
				json: isSelfClaim ? data.json : '{}'
			},
			update: {}
		});

		// Ensure there is an endorsement for this claim, on behalf of this admin, if not self-awarding
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
					update: {} // We don't replace previous invite content, maybe we should though.
			  });

		// Notify user of claim
		const emailResult = await sendOrcaMail({
			from: org.email,
			to: data.inviteeEmail,
			subject: m.warm_tangy_deer_awarded(),
			text: m.gentle_brave_falcon_awardeddesc({
				achievementName: achievement.name,
				communityName: org.name,
				badgeUrl: `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/login?e=${encodeURIComponent(
					data.inviteeEmail
				)}&next=${encodeURIComponent('/claims/' + claim.id)}`
			})
		});
		if (!emailResult.success) {
			throw error(500, m.email_transmissionError({ message: emailResult.error?.message ?? '' }));
		}

		return {
			status: 201,
			type: 'success',
			data: {
				created: true,
				invited: false,
				selfClaim: isSelfClaim,
				endorsement,
				identifier
			}
		};
	} else {
		// If there is not a member, create a claimEndorsement without a claim connected
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
				update: {}
			});

		// If there isn't already a user, we'll invite them to join by email
		const emailResult = await sendOrcaMail({
			from: org.email,
			to: data.inviteeEmail,
			subject: m.org_inviteToJoin({ orgName: org.name }),
			text: m.org_inviteToJoin_description({
				achievementName: endorsement.achievement?.name ?? '',
				orgName: org.name,
				inviteLink: `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/achievements/${
					endorsement.achievementId
				}/claim?i=${endorsement.id}&e=${encodeURIComponent(data.inviteeEmail)}`
			})
		});
		if (!emailResult.success) {
			throw error(500, m.email_transmissionError({ message: emailResult.error?.message ?? '' }));
		}

		// TODO: we can't actually tell whether created. Consider adopting a createdAt, updatedAt approach,
		// but for now detect based on whether JSON is the same in the result as it was in the request?
		return {
			type: 'success',
			status: 201,
			data: {
				created: true,
				invited: !identifier?.verifiedAt,
				selfClaim: false,
				endorsement,
				identifier
			}
		};
	}
};
