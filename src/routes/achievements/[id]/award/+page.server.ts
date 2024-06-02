import * as m from '$lib/i18n/messages';
import * as dotenv from 'dotenv';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import { getAchievement } from '$lib/data/achievement';
import { sendOrcaMail } from '$lib/email/sendEmail';
import type { AchievementClaim, Identifier, Prisma } from '@prisma/client';
import stripTags from '$lib/utils/stripTags';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
// import { basicFormDataToCredential } from '$lib/credentials/achievementCredential';
// import { awardFormSchema } from '$lib/data/awardForm';
// import { ValidationError } from 'yup';

dotenv.config();

export const load: PageServerLoad = async ({ locals, params }) => {
	// redirect user if logged out
	if (!locals.session?.user) throw redirect(302, `/achievements/${params.id}`);

	const achievement = await prisma.achievement.findFirstOrThrow({
		where: {
			id: params.id,
			organizationId: locals.org.id
		},
		include: {
			achievementConfig: true,
			_count: {
				select: { achievementClaims: true, claimEndorsements: true }
			}
		}
	});

	return {
		achievement: achievement
	};
};

export const actions: Actions = {
	default: async ({ locals, cookies, request, params }) => {
		/*  
		Endpoint use cases:
		 
		*/
		// Award a badge to a user by id (DID) or email identifier, but generate no user claim for it.
		const authenticatedUserId = locals.session?.user?.id;

		const requestData = await request.formData();
		const data: Prisma.ClaimEndorsementCreateInput = {
			achievement: { connect: { id: params.id } },
			organization: { connect: { id: locals.org.id } },
			inviteeEmail: stripTags(requestData.get('email')?.toString()) || '',

			json: JSON.stringify({
				id: stripTags(requestData.get('evidenceUrl')?.toString()),
				narrative: stripTags(requestData.get('narrative')?.toString())
			} as App.EvidenceItem)
		};
		const forceCreateUser = stripTags(requestData.get('forceCreateUser')?.toString()) || 'no';

		if (data.inviteeEmail === undefined)
			throw error(400, {
				code: 'recipientEmail',
				message: m.invite_recipientIdentifierRequiredError()
			});

		const achievement = await getAchievement(params.id, locals.org.id);
		const achievementConfig = achievement.achievementConfig as
			| App.AchievementConfigWithJson
			| undefined;

		// UNAUTHENTICATD USERS: can create an invite for open-claim achievements only.
		if (
			!authenticatedUserId &&
			achievement.achievementConfig?.claimable &&
			!achievement?.achievementConfig?.claimRequiresId
		) {
			// achievement is claimable without any prerequisite. Unauthenticated
			// user will create a self-endorsement (with null creator) and then use it as an invite-code.
			const endorsement = await prisma.claimEndorsement.upsert({
				where: {
					creatorId_achievementId_inviteeEmail: {
						creatorId: '',
						achievementId: params.id,
						inviteeEmail: data.inviteeEmail
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
				status: { success: true, created: true, invited: false, selfClaim: true },
				endorsement,
				identifier: null,
				claim: null
			};
		} else if (!authenticatedUserId) {
			// Not an open claim achievement, and not authenticated.
			throw error(403, m.invite_achievementUnauthorizedError());
		}

		if (
			!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none') &&
			!achievementConfig?.json?.capabilities?.inviteRequires
		) {
			// NON ADMIN USERS for a badge that is only inviteable by admins
			throw error(403, m.invite_unauthorizedNonAdminError());
		}

		if (authenticatedUserId && achievementConfig?.json?.capabilities?.inviteRequires) {
			const inviteQualificationClaim = await prisma.achievementClaim.findFirst({
				where: {
					achievementId: params.id,
					userId: authenticatedUserId
				}
			});
			if (!inviteQualificationClaim || inviteQualificationClaim.validFrom === null) {
				throw error(403, m.invite_unauthorizedNonAdminError());
			}
		}

		// ADMIN USERS and QUALIFIED INVITERS: May create claims for other users in unaccepted state.
		data.creator = { connect: { id: authenticatedUserId } };

		let identifier: Identifier | null = await prisma.identifier.findFirst({
			where: {
				identifier: data.inviteeEmail,
				organizationId: locals.org.id as string
			}
		});

		// Force create account option for admins only
		if (
			['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none') &&
			forceCreateUser != 'no' &&
			!identifier?.verifiedAt
		) {
			// TODO remove this feature now that qualified invitation is improving.
			const givenName = stripTags(requestData.get('givenName')?.toString()) || '';
			const familyName = stripTags(requestData.get('familyName')?.toString()) || '';

			const user = await prisma.user.create({
				data: {
					givenName,
					familyName,
					organization: { connect: { id: locals.org.id } },
					identifiers: {
						create: [
							{
								type: 'EMAIL',
								identifier: data.inviteeEmail,
								organization: { connect: { id: locals.org.id } },
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
			const isSelfClaim = authenticatedUserId == identifier?.userId;

			// Ensure there is an existing claim for the identified member
			const claim = await prisma.achievementClaim.upsert({
				where: {
					userId_achievementId: {
						userId: identifier.userId,
						achievementId: params.id
					}
				},
				create: {
					user: { connect: { id: identifier.userId } },
					organization: { connect: { id: locals.org.id } },
					achievement: { connect: { id: params.id } },
					claimStatus: isSelfClaim ? 'ACCEPTED' : 'UNACCEPTED',
					validFrom: new Date(),
					creator: { connect: { id: authenticatedUserId } },
					json: isSelfClaim || forceCreateUser != 'no' ? data.json : '{}'
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
								creatorId: authenticatedUserId,
								inviteeEmail: data.inviteeEmail,
								achievementId: params.id
							}
						},
						create: { ...data, claim: { connect: { id: claim.id } } },
						update: {}
				  });

			// Notify user of claim
			if (requestData.get('skipEmailNotification')?.toString() != 'on') {
				const emailResult = await sendOrcaMail({
					from: locals.org.email,
					to: data.inviteeEmail,
					subject: m.awardedBadge(),
					text: m.awardedBadge_email_description({
						achievementName: claim.achievement.name,
						communityName: locals.org.name,
						badgeUrl: `${PUBLIC_HTTP_PROTOCOL}://${locals.org.domain}/login?e=${encodeURIComponent(
							data.inviteeEmail
						)}&next=${encodeURIComponent('/claims/' + claim.id)}`
					})
				});
				if (!emailResult.success) {
					throw error(
						500,
						m.email_transmissionError({ message: emailResult.error?.message ?? '' })
					);
				}
			}

			return {
				status: { success: true, created: true, invited: false, selfClaim: isSelfClaim },
				endorsement,
				identifier,
				claim
			};
		} else {
			// If there is not a member, create a claimEndorsement without a claim connected
			const endorsement = await prisma.claimEndorsement.upsert({
				where: {
					creatorId_achievementId_inviteeEmail: {
						creatorId: authenticatedUserId,
						inviteeEmail: data.inviteeEmail,
						achievementId: params.id
					}
				},
				create: data,
				update: {},
				include: {
					achievement: true
				}
			});

			// If there isn't already a user, we'll invite them to join by email
			if (requestData.get('skipEmailNotification')?.toString() != 'on') {
				const emailResult = await sendOrcaMail({
					from: locals.org.email,
					to: data.inviteeEmail,
					subject: m.org_inviteToJoin({ orgName: locals.org.name }),
					text: m.org_inviteToJoin_description({
						achievementName: endorsement.achievement.name,
						orgName: locals.org.name,
						inviteLink: `${PUBLIC_HTTP_PROTOCOL}://${locals.org.domain}/achievements/${
							endorsement.achievementId
						}/claim?i=${endorsement.id}&e=${encodeURIComponent(data.inviteeEmail)}`
					})
				});
				if (!emailResult.success) {
					throw error(
						500,
						m.email_transmissionError({ message: emailResult.error?.message ?? '' })
					);
				}
			}

			// TODO: we can't actually tell whether created. Consider adopting a createdAt, updatedAt approach,
			// but for now detect based on whether JSON is the same in the result as it was in the request?
			return {
				status: {
					success: true,
					created: true,
					invited: !identifier?.verifiedAt,
					selfClaim: false
				},
				endorsement,
				identifier,
				claim: null
			};
		}
	}
};
