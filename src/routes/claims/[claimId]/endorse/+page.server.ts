import * as m from '$lib/i18n/messages';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { prisma } from '$lib/../prisma/client';
import type { AchievementClaim } from '@prisma/client';
import stripTags from '$lib/utils/stripTags';
import { getValidUserClaim } from '$lib/data/achievementClaim';

export const load = async ({ locals, params }) => {
	// redirect user if logged out or doesn't hold org admin role
	if (!locals.session?.user?.id) throw redirect(303, '/login');

	const claim = await prisma.achievementClaim.findUniqueOrThrow({
		where: { id: params.claimId },
		include: {
			achievement: true, // TODO: also should probably fetch related achievements to see if authenticated user is in the reviewer class
			endorsements: true,
			user: true
		}
	});
	const myEndorsements = claim.endorsements.filter((e) => e.creatorId == locals.session?.user?.id); // e.creatorId

	return {
		organization: locals.org,
		claim,
		myEndorsements,
		achievement: claim.achievement
	};
};

export const actions: Actions = {
	default: async ({ locals, request, params }) => {
		// Award a badge to a user by id (DID) or email identifier, but generate no user claim for it
		if (!locals.session?.user) {
			throw error(401, m.quick_happy_kite_zoom());
		}

		const requestData = await request.formData();
		const data = {
			organization: { connect: { id: locals.org.id } },

			json: JSON.stringify({
				id: stripTags(requestData.get('evidenceUrl')?.toString()),
				narrative: stripTags(requestData.get('narrative')?.toString())
			} as App.EvidenceItem)
		};

		const claim = await prisma.achievementClaim.findUniqueOrThrow({
			where: { id: params.claimId },
			include: {
				achievement: {
					include: { achievementConfig: true }
				},
				endorsements: {
					where: {
						creatorId: locals.session.user.id
					}
				},
				user: { include: { identifiers: true } }
			}
		});

		const inviteeEmail = claim.user.identifiers.filter((i) => i.type == 'EMAIL')[0]?.identifier;
		if (!inviteeEmail) throw error(400, m.curly_tired_guppy_link());

		const created = true;
		// If there is a member, ensure that there is an AchievementClaim
		const endorsement = await prisma.claimEndorsement.upsert({
			where: {
				creatorId_achievementId_inviteeEmail: {
					creatorId: locals.session.user.id,
					achievementId: claim.achievementId,
					inviteeEmail
				}
			},
			create: {
				inviteeEmail,
				claim: { connect: { id: claim.id } },
				organization: { connect: { id: locals.org.id } },
				achievement: { connect: { id: claim.achievementId } },
				creator: { connect: { id: locals.session.user.id } },
				json: data.json
			},
			update: {
				json: data.json,
				claim: { connect: { id: claim.id } }
			}
		});

		let updatedClaim: AchievementClaim | null = null;
		let shouldMakeClaimValid = false;
		// check the cases where we should make the claim valid
		if (
			!claim.validFrom &&
			['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none')
		) {
			// If the current user is an admin, the claim becomes valid.
			shouldMakeClaimValid = true;
		} else if (!claim.validFrom && claim.achievement.achievementConfig?.reviewRequiresId) {
			// If the current user is not an admin but holds the required reviewer badge, the claim becomes valid.
			const endorserReviewerBadge = await getValidUserClaim(
				locals.session.user.id,
				claim.achievement.achievementConfig.reviewRequiresId,
				locals.org.id
			);
			if (endorserReviewerBadge) {
				shouldMakeClaimValid = true;
			}
		} else if (!claim.validFrom && !claim.achievement.achievementConfig?.reviewRequiresId) {
			// If the validFrom date just isn't set already but should be.
			shouldMakeClaimValid = true;
		}

		// make it valid if we should
		if (shouldMakeClaimValid) {
			updatedClaim = await prisma.achievementClaim.update({
				where: { id: params.claimId },
				data: {
					validFrom: new Date()
				}
			});
		}

		return {
			status: { success: true, created, invited: false },
			endorsement,
			claim: updatedClaim ?? claim
		};
	}
};
