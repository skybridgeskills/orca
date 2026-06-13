import { ClaimStatus, type Identifier, type Visibility } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { AchievementClaim, ClaimEndorsement } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { getAchievement } from '$lib/data/achievement';
import { getUserClaim, getValidUserClaim } from '$lib/data/achievementClaim';
import { resultsFromEndorsementJson, reviewIsCurrent } from '$lib/data/resultDescription';
import * as m from '$lib/i18n/messages';
import { isSuspended } from '$lib/server/moderation/suspension';
import { notifyStewardsForReview, stewardIdsFor } from '$lib/server/stewards';
import { isVisibility } from '$lib/server/visibility';
import stripTags from '$lib/utils/stripTags';

export const load = async ({ locals, params, url }) => {
	const inviteId = url.searchParams.get('i');
	const inviteeEmail = url.searchParams.get('e');
	const achievement = await getAchievement(params.id, locals.org.id);
	let invite: ClaimEndorsement | null = null;

	const existingBadgeClaim = locals.session?.user?.id
		? await getUserClaim(locals.session?.user.id, params.id, locals.org.id)
		: null;

	if (existingBadgeClaim) redirect(303, `/claims/${existingBadgeClaim.id}`);

	// If the user has been directly invited to claim the badge, let them proceed
	if (inviteId && inviteeEmail) {
		invite = await prisma.claimEndorsement.findUnique({ where: { id: inviteId } });
		if (invite && invite?.inviteeEmail != inviteeEmail) error(403, m.sharp_crazy_boar_climb());
		if (invite?.organizationId != locals.org.id) error(404, 'Invitation not found');
	}

	// If this badge requires a member to hold another badge, get the relevant claim for that badge.
	// If they have it, they are eligible to claim this badge.
	const requiredBadgeClaim =
		achievement.claimable && achievement.claimRequiresId && locals.session?.user?.id
			? await getValidUserClaim(locals.session?.user.id, achievement.claimRequiresId, locals.org.id)
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
	claim: async ({ locals, request, params }) => {
		if (!locals.session?.user) {
			error(401, m.smooth_bad_goat_cook());
		}

		const achievement = await getAchievement(params.id, locals.org.id);

		// P5 moderation: no new claims against a suspended achievement.
		if (
			await isSuspended({
				originOrgId: locals.org.id,
				targetType: 'ACHIEVEMENT',
				targetId: params.id
			})
		)
			error(403, m.glum_stout_toad_block());

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
			if (invite && invite?.achievementId != params.id) error(403, m.sharp_crazy_boar_climb());
			else if (invite && !userEmails.includes(invite.inviteeEmail))
				error(403, m.soft_bright_robin_link());
		}

		if (!invite && !achievement.claimable) error(400, m.clear_weary_guppy_support());

		// get required badge claim if the user needs one
		const requiredBadgeClaim =
			achievement.claimRequiresId && locals.session?.user.id && !invite
				? await getValidUserClaim(
						locals.session.user.id,
						achievement.claimRequiresId,
						locals.org.id
					)
				: null;

		if (achievement.claimRequiresId && !requiredBadgeClaim && !invite)
			error(400, {
				code: m.fresh_bright_sparrow_notfound(),
				message: m.wide_patchy_marten_view()
			});

		const data: Prisma.AchievementClaimCreateInput = {
			organization: { connect: { id: locals.org.id } },
			achievement: { connect: { id: params.id } },
			user: { connect: { id: locals.session.user.id } },
			claimStatus: ClaimStatus.ACCEPTED,
			// Snapshot the claimant's default visibility at creation time.
			visibility: locals.session.user.defaultVisibility ?? 'COMMUNITY',

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

		// Rubric: when the achievement has a rubric, only endorsements whose review is
		// current count toward validity (no-op for no-rubric / narrative-only reviews).
		const currentEndorsements = existingEndorsements.filter((ee) =>
			reviewIsCurrent(resultsFromEndorsementJson(ee.json), achievement.json)
		);

		// Steward overlay: a prior (current) endorsement by a current steward validates
		// the claim immediately, regardless of the base review rule.
		const stewards = stewardIdsFor(achievement);
		const stewardEndorsed = currentEndorsements.some(
			(ee) => ee.creatorId && stewards.includes(ee.creatorId)
		);

		if (stewardEndorsed) {
			data.validFrom = new Date();
		} else if (achievement.reviewRequiresId) {
			const reviewerClaims = await prisma.achievementClaim.findMany({
				where: {
					AND: {
						userId: {
							in: currentEndorsements
								.map((ee) => (ee.creatorId !== null ? [ee.creatorId] : []))
								.flat(1)
						},
						achievementId: achievement.reviewRequiresId,
						validFrom: { not: null }
					},
					OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }]
				}
			});
			const numReviewsRequired = achievement.json?.reviewsRequired ?? 1;
			if (reviewerClaims?.length >= numReviewsRequired) {
				data.validFrom = new Date();
			}
		} else if (achievement.json?.reviewsRequired && achievement.json.reviewsRequired > 0) {
			// Admin review required - check if current user is an admin
			if (['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none')) {
				// Current user is an admin, so they can make the claim immediately valid
				data.validFrom = new Date();
			}
			// If not an admin, validFrom remains undefined (claim will need admin endorsement)
		} else {
			// If review is not required, claim becomes valid immediately.
			data.validFrom = new Date();
		}

		const claim = await prisma.achievementClaim.create({ data });

		// If the claim still needs review and the achievement has stewards, notify them.
		const reviewRequired =
			!!achievement.reviewRequiresId || (achievement.json?.reviewsRequired ?? 0) > 0;
		if (!claim.validFrom && reviewRequired && stewards.length) {
			await notifyStewardsForReview({
				achievement,
				org: locals.org,
				achievementId: params.id,
				claimId: claim.id,
				claimantUserId: locals.session.user.id
			});
		}

		// Get rid of any outstanding invites that were self-invites or unauthenticated
		await prisma.claimEndorsement.deleteMany({
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

		redirect(303, `/claims/${claim.id}`);
	},
	updateClaim: async ({ locals, request, params }) => {
		if (!locals.session?.user) error(401, m.smooth_bad_goat_cook());

		const existingClaim = await getUserClaim(locals.session?.user?.id, params.id, locals.org.id);
		if (!existingClaim) error(401, m.legal_grand_goat_view());

		const formData = await request.formData();
		const claimStatus = formData.get('claimStatus')?.toString();
		const narrative = stripTags(formData.get('narrative')?.toString());
		const evidenceUrl = stripTags(formData.get('evidenceUrl')?.toString());

		// Optional, owner-only visibility update. Validate against the enum; if the
		// field is absent or invalid, leave the claim's visibility unchanged.
		const visibilityRaw = formData.get('visibility')?.toString();
		const visibility: Visibility | undefined = isVisibility(visibilityRaw)
			? visibilityRaw
			: undefined;

		let updatedClaim: AchievementClaim | null = null;
		if (claimStatus == 'ACCEPTED') {
			// Update validFrom if needed, based on the achievement's review rules and existing endorsements.
			let { validFrom } = existingClaim;
			const achievement = await getAchievement(params.id, locals.org.id);
			const stewards = stewardIdsFor(achievement);
			if (!validFrom) {
				// Steward overlay: a prior *current* endorsement by a current steward validates now.
				const stewardEndorsements = stewards.length
					? await prisma.claimEndorsement.findMany({
							where: { claimId: existingClaim.id, creatorId: { in: stewards } }
						})
					: [];
				const stewardEndorsed = stewardEndorsements.some((ee) =>
					reviewIsCurrent(resultsFromEndorsementJson(ee.json), achievement.json)
				);
				if (stewardEndorsed) {
					validFrom = new Date();
				} else if (achievement.reviewRequiresId) {
					// If review is required, we find some reviews and check if they are enough.
					const numReviewsRequired = achievement.json?.reviewsRequired ?? 1;
					const reviewerClaims = await prisma.achievementClaim.findMany({
						where: {
							AND: {
								achievementId: achievement.reviewRequiresId,
								validFrom: { not: null }
							},
							OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }]
						},
						take: numReviewsRequired
					});

					if (reviewerClaims?.length >= numReviewsRequired) {
						validFrom = new Date();
					}
				} else {
					// If review is not required, claim becomes valid immediately.
					validFrom = new Date();
				}
			}

			updatedClaim = await prisma.achievementClaim.update({
				where: {
					userId_achievementId: {
						userId: locals.session?.user?.id as string,
						achievementId: params.id as string
					}
				},
				data: {
					claimStatus,
					validFrom,
					...(visibility !== undefined && { visibility }),
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

			// If the re-accepted claim still needs review and has stewards, notify them.
			const reviewRequired =
				!!achievement.reviewRequiresId || (achievement.json?.reviewsRequired ?? 0) > 0;
			if (!validFrom && reviewRequired && stewards.length) {
				await notifyStewardsForReview({
					achievement,
					org: locals.org,
					achievementId: params.id,
					claimId: existingClaim.id,
					claimantUserId: locals.session.user.id
				});
			}
		} else if (claimStatus == 'REJECTED') {
			// just update claim status, don't override json
			updatedClaim = await prisma.achievementClaim.update({
				where: {
					userId_achievementId: {
						userId: locals.session?.user?.id as string,
						achievementId: params.id as string
					}
				},
				data: { claimStatus, ...(visibility !== undefined && { visibility }) }
			});
		}

		// Get rid of a self-invitation if exists
		await prisma.claimEndorsement.deleteMany({
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
		await prisma.claimEndorsement.updateMany({
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
