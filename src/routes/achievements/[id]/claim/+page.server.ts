import * as m from '$lib/i18n/messages';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/../prisma/client';
import type { Prisma } from '@prisma/client';
import { ClaimStatus, type Identifier } from '@prisma/client';
import stripTags from '$lib/utils/stripTags';
import { ValidationError } from 'yup';
import { achievementFormSchema } from '$lib/data/achievementForm';
import { getAchievement } from '$lib/data/achievement';
import { getUserClaim } from '$lib/data/achievementClaim';
import type { AchievementClaim, AchievementCredential, ClaimEndorsement } from '@prisma/client';
import { inviteId } from '$lib/stores/activeClaimStore';

export const load = async ({ locals, params, url }) => {
	const inviteId = url.searchParams.get('i');
	const inviteeEmail = url.searchParams.get('e');
	const achievement = await getAchievement(params.id, locals.org.id);
	const config = achievement.achievementConfig;
	let invite: ClaimEndorsement | null = null;

	const existingBadgeClaim = locals.session?.user?.id
		? await getUserClaim(locals.session?.user.id, params.id, locals.org.id)
		: null;

	if (existingBadgeClaim) throw redirect(303, `/claims/${existingBadgeClaim.id}`);

	// If the user has been directly invited to claim the badge, let them proceed
	if (inviteId && inviteeEmail) {
		invite = await prisma.claimEndorsement.findUnique({ where: { id: inviteId } });
		if (invite && invite?.inviteeEmail != inviteeEmail)
			throw error(403, m.claim_invitationInvalidError());
		if (invite?.organizationId != locals.org.id) throw error(404, 'Invitation not found');
	}

	// If this badge requires a member to hold another badge, get the relevant claim for that badge.
	// If they have it, they are eligible to claim this badge.
	const requiredBadgeClaim =
		config?.claimable && config?.claimRequiresId && locals.session?.user?.id
			? await getUserClaim(locals.session?.user.id, config?.claimRequiresId, locals.org.id)
			: null;

	return {
		organization: locals.org,
		achievement,
		user: locals.session?.user,
		existingBadgeClaim,
		requiredBadgeClaim,
		inviteId,
		inviteeEmail,
		inviteCreatedAt: invite?.createdAt
	};
};

export const actions = {
	// The authenticated user claims a badge
	claim: async ({ locals, cookies, request, params }) => {
		if (!locals.session?.user) {
			throw error(401, m.claim_unauthenticatedError());
		}

		const achievement = await getAchievement(params.id, locals.org.id);
		const config = achievement.achievementConfig;

		const formData = await request.formData();
		const inviteId = formData.get('inviteId')?.toString();
		let invite: ClaimEndorsement | null = null;
		const userIdentifiers = locals.session?.user.identifiers;
		const userEmails: string[] = userIdentifiers
			? userIdentifiers
					.filter((i: Identifier) => i.type === 'EMAIL')
					.map((i: Identifier) => i.identifier) || []
			: [];

		// If the user has been directly invited to claim the badge, let them proceed
		if (userEmails.length && inviteId) {
			invite = await prisma.claimEndorsement.findUnique({ where: { id: inviteId } });
			if (invite && invite?.achievementId != params.id)
				throw error(403, m.claim_invitationInvalidError());
			else if (invite && !userEmails.includes(invite.inviteeEmail))
				throw error(403, m.claim_invitationEmailReconciliationError());
		}

		if (!invite && !config?.claimable) throw error(400, m.claim_achievementNotClaimableError());

		// get required badge claim if the user needs one
		const requiredBadgeClaim =
			config?.claimRequiresId && locals.session?.user.id && !invite
				? await getUserClaim(locals.session.user.id, config?.claimRequiresId, locals.org.id)
				: null;

		if (config?.claimRequiresId && !requiredBadgeClaim && !invite)
			throw error(400, {
				code: m.notFound(),
				message: m.claim_userNotMeetsPrerequsiteError()
			});

		let data: Prisma.AchievementClaimCreateInput = {
			organization: { connect: { id: locals.org.id } },
			achievement: { connect: { id: params.id } },
			user: { connect: { id: locals.session.user.id } },
			claimStatus: ClaimStatus.ACCEPTED,

			json: JSON.stringify(
				Object.fromEntries(
					[
						['narrative', stripTags(formData.get('narrative')?.toString())],
						['id', stripTags(formData.get('evidenceUrl')?.toString())]
					].filter((e) => !!e[1])
				) as App.EvidenceItem
			),
			endorsements: {
				connect: [] as Array<{ id: string }>
			}
		};

		const existingEndorsements =
			(await prisma.claimEndorsement.findMany({
				where: {
					inviteeEmail: {
						in: userEmails
					},
					achievementId: params.id
				}
			})) ?? [];

		if (data.endorsements !== undefined && existingEndorsements.length)
			// Avoid TS error on AchievementClaimCreateInput assumption
			data.endorsements.connect = existingEndorsements.map((ee) => {
				return { id: ee.id };
			});

		if (achievement.achievementConfig?.reviewRequiresId) {
			const reviewerClaims = await prisma.achievementClaim.findMany({
				where: {
					AND: {
						userId: {
							in: existingEndorsements
								.map((ee) => (ee.creatorId !== null ? [ee.creatorId] : []))
								.flat(1)
						},
						achievementId: achievement.achievementConfig?.reviewRequiresId,
						validFrom: { not: null }
					},
					OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }]
				}
			});
			const numReviewsRequired = achievement.achievementConfig.reviewsRequired ?? 1;
			if (reviewerClaims?.length >= numReviewsRequired) {
				data.validFrom = new Date();
			}
		} else {
			// If review is not required, claim becomes valid immediately.
			data.validFrom = new Date();
		}

		const claim = await prisma.achievementClaim.create({ data });

		// Get rid of any outstanding invites that were self-invites or unauthenticated
		const pruneSelfInvites = await prisma.claimEndorsement.deleteMany({
			where: {
				OR: [
					{
						inviteeEmail: {
							in: locals.session?.user?.identifiers
								.filter((i) => i.type == 'EMAIL')
								.map((i) => i.identifier)
						},
						creatorId: null,
						achievementId: params.id
					},
					{
						creatorId: locals.session.user.id,
						achievementId: params.id,
						inviteeEmail: {
							in: locals.session?.user?.identifiers
								.filter((i) => i.type == 'EMAIL')
								.map((i) => i.identifier)
						}
					}
				]
			}
		});

		throw redirect(303, `/claims/${claim.id}`);
	},
	updateClaim: async ({ locals, cookies, request, params }) => {
		if (!locals.session?.user) throw error(401, m.claim_unauthenticatedError());

		const existingClaim = await getUserClaim(locals.session?.user?.id, params.id, locals.org.id);
		if (!existingClaim) throw error(401, m.claim_noExistingFoundError());

		const formData = await request.formData();
		const claimStatus = formData.get('claimStatus')?.toString();
		const narrative = stripTags(formData.get('narrative')?.toString());
		const evidenceUrl = stripTags(formData.get('evidenceUrl')?.toString());

		let updatedClaim: AchievementClaim | null = null;
		if (claimStatus == 'ACCEPTED') {
			updatedClaim = await prisma.achievementClaim.update({
				where: {
					userId_achievementId: {
						userId: locals.session?.user?.id as string,
						achievementId: params.id as string
					}
				},
				data: {
					claimStatus,
					json: JSON.stringify(
						Object.fromEntries(
							[
								['narrative', narrative],
								['id', evidenceUrl]
							].filter((e) => !!e[1])
						)
					)
				}
			});
		} else if (claimStatus == 'REJECTED') {
			// just update claim status, don't override json
			updatedClaim = await prisma.achievementClaim.update({
				where: {
					userId_achievementId: {
						userId: locals.session?.user?.id as string,
						achievementId: params.id as string
					}
				},
				data: { claimStatus }
			});
		}

		// Get rid of a self-invitation if exists
		const pruneSelfInvites = await prisma.claimEndorsement.deleteMany({
			where: {
				OR: [
					{
						inviteeEmail: {
							in: locals.session?.user?.identifiers
								.filter((i) => i.type == 'EMAIL')
								.map((i) => i.identifier)
						},
						creatorId: null,
						achievementId: params.id
					},
					{
						creatorId: locals.session.user.id,
						achievementId: params.id,
						inviteeEmail: {
							in: locals.session?.user?.identifiers
								.filter((i) => i.type == 'EMAIL')
								.map((i) => i.identifier)
						}
					}
				]
			}
		});
		// TODO remove: this is failsafe code. It probably won't find anything, because gap at claim time was fixed.
		const existingEndorsements = await prisma.claimEndorsement.updateMany({
			where: {
				inviteeEmail: {
					in: locals.session?.user?.identifiers
						.filter((i) => i.type == 'EMAIL')
						.map((i) => i.identifier)
				},
				achievementId: params.id,
				claimId: null
			},
			data: {
				claimId: updatedClaim?.id
			}
		});

		return updatedClaim;
	}
};
