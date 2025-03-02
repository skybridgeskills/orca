import * as m from '$lib/i18n/messages';
import { ActionResult, error } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { Identifier, Organization, Prisma, Session, User } from '@prisma/client';
import { sendOrcaMail } from '$lib/email/sendEmail';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

export const getAchievement = async (achievementId: string, orgId: string) => {
	return await prisma.achievement.findFirstOrThrow({
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
	});
};

export interface InviteArgs {
	achievementId: string;
	org: Organization;
	inviteeEmail: string;
	json: Prisma.JsonObject | string;
	session: App.SessionData | null;

	// Force create options only apply if user has admin role
	forceCreateUser?: boolean;
	givenName?: string;
	familyName?: string;
}

export const inviteToClaim = async ({
	achievementId,
	org,
	inviteeEmail,
	json,
	session,
	forceCreateUser,
	givenName,
	familyName
}: InviteArgs) => {
	const data: Prisma.ClaimEndorsementCreateInput = {
		achievement: { connect: { id: achievementId } },
		organization: { connect: { id: org.id } },
		inviteeEmail: inviteeEmail,
		json: json
	};

	if (inviteeEmail === undefined)
		throw error(400, {
			code: 'recipientEmail',
			message: m.invite_recipientIdentifierRequiredError()
		});

	const achievement = await getAchievement(achievementId, org.id);
	const achievementConfig = achievement.achievementConfig as
		| App.AchievementConfigWithJson
		| undefined;

	// UNAUTHENTICATD USERS: can create an invite for open-claim achievements only.
	if (
		!session?.user?.id &&
		achievement.achievementConfig?.claimable &&
		!achievement?.achievementConfig?.claimRequiresId
	) {
		// achievement is claimable without any prerequisite. Unauthenticated
		// user will create a self-endorsement (with null creator) and then use it as an invite-code.
		const endorsement = await prisma.claimEndorsement.upsert({
			where: {
				creatorId_achievementId_inviteeEmail: {
					creatorId: '',
					achievementId: achievementId,
					inviteeEmail: inviteeEmail
				}
			},
			create: data,
			select: {
				id: true
			},
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
				identifier: null,
				claim: null
			}
		};
	} else if (!session?.user?.id) {
		// Not an open claim achievement, and not authenticated.
		throw error(403, m.invite_achievementUnauthorizedError());
	}

	if (
		!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(session?.user?.orgRole || 'none') &&
		!achievementConfig?.json?.capabilities?.inviteRequires
	) {
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
				achievementId,
				userId: session.user.id
			}
		});
		if (!inviteQualificationClaim || inviteQualificationClaim.validFrom === null) {
			throw error(403, m.tense_raw_cuckoo_dart());
		}
	}

	// ADMIN USERS and QUALIFIED INVITERS: May create claims for other users in unaccepted state.
	data.creator = { connect: { id: session.user.id } };

	let identifier: Identifier | null = await prisma.identifier.findFirst({
		where: {
			identifier: data.inviteeEmail,
			organizationId: org.id
		}
	});

	// Force create account option for admins only
	if (
		['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(session?.user?.orgRole || 'none') &&
		forceCreateUser &&
		!identifier?.verifiedAt
	) {
		// TODO remove this feature now that qualified invitation is improving.
		const user = await prisma.user.create({
			data: {
				givenName,
				familyName,
				organization: { connect: { id: org.id } },
				identifiers: {
					create: [
						{
							type: 'EMAIL',
							identifier: data.inviteeEmail,
							organization: { connect: { id: org.id } },
							verifiedAt: new Date()
						}
					]
				}
			},
			include: {
				identifiers: true
			}
		});
		identifier = user.identifiers.find((i) => true) ?? null;
	}
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
				validFrom: new Date(),
				creator: { connect: { id: session.user.id } },
				json: isSelfClaim || forceCreateUser ? data.json : '{}'
			},
			update: {},
			include: {
				achievement: true
			}
		});

		// Ensure there is an endorsement for this claim, on behalf of this admin, if not self-awarding
		const endorsement = isSelfClaim
			? null
			: await prisma.claimEndorsement.upsert({
					where: {
						creatorId_achievementId_inviteeEmail: {
							creatorId: session.user.id,
							inviteeEmail,
							achievementId
						}
					},
					create: { ...data, claim: { connect: { id: claim.id } } },
					update: {}
			  });

		// Notify user of claim
		const emailResult = await sendOrcaMail({
			from: org.email,
			to: data.inviteeEmail,
			subject: m.awardedBadge(),
			text: m.awardedBadge_email_description({
				achievementName: claim.achievement.name,
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
				success: true,
				created: true,
				invited: false,
				selfClaim: isSelfClaim,
				endorsement,
				identifier,
				claim
			}
		};
	} else {
		// If there is not a member, create a claimEndorsement without a claim connected
		const endorsement = await prisma.claimEndorsement.upsert({
			where: {
				creatorId_achievementId_inviteeEmail: {
					creatorId: session.user.id,
					inviteeEmail,
					achievementId
				}
			},
			create: data,
			update: {},
			include: {
				achievement: true
			}
		});

		// If there isn't already a user, we'll invite them to join by email
		const emailResult = await sendOrcaMail({
			from: org.email,
			to: data.inviteeEmail,
			subject: m.org_inviteToJoin({ orgName: org.name }),
			text: m.org_inviteToJoin_description({
				achievementName: endorsement.achievement.name,
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
				identifier,
				claim: null
			}
		};
	}
};
