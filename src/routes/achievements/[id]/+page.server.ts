import type { ClaimEndorsement, User } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import * as m from '$lib/i18n/messages';
import { canEditAchievements, canInviteToAchievement } from '$lib/server/permissions';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const achievementId = params.id;

	// Check if user has permission to edit achievements
	let editAchievementCapability = false;
	if (locals.session?.user?.id) {
		editAchievementCapability = await canEditAchievements({
			user: {
				id: locals.session.user.id,
				orgRole: locals.session.user.orgRole
			},
			org: {
				id: locals.org.id,
				json: locals.org.json
			}
		});
	}
	const achievement = await prisma.achievement.findFirstOrThrow({
		where: {
			id: achievementId,
			organizationId: locals.org.id
		},
		include: {
			_count: {
				select: { achievementClaims: true }
			}
		}
	});

	const relatedAchievements = await prisma.achievement.findMany({
		where: {
			id: {
				in: [achievement.claimRequiresId || 'N/A', achievement.reviewRequiresId || 'None']
			}
		}
	});

	// Get the existing claim(s) user has made for this badge,
	// or for the badge that is required to be eligible to claim this badge
	const relatedClaims = locals.session?.user?.id
		? await prisma.achievementClaim.findMany({
				where: {
					achievementId: {
						in: [achievementId, achievement.claimRequiresId || 'N/A']
					},
					userId: locals.session?.user.id
				},
				include: {
					user: true,
					_count: {
						select: { endorsements: true }
					}
				}
			})
		: [];

	let inviteCapability = false;
	if (locals.session?.user?.id) {
		inviteCapability = await canInviteToAchievement({
			user: {
				id: locals.session.user.id,
				orgRole: locals.session.user.orgRole
			},
			achievement: achievement as unknown as App.AchievementWithJson
		});
	}

	let outstandingInvites: (ClaimEndorsement & { creator: User | null })[] = [];
	if (locals.session?.user?.id && relatedClaims.length == 0) {
		outstandingInvites =
			(await prisma.claimEndorsement.findMany({
				where: {
					inviteeEmail: {
						in: locals.session.user.identifiers
							.filter((i) => i.type == 'EMAIL')
							.map((i) => i.identifier)
					},
					organizationId: locals.org.id,
					claimId: null,
					achievementId: params.id
				},
				include: {
					creator: true
				}
			})) ?? [];
	}

	return {
		editAchievementCapability,
		inviteCapability,
		achievement,
		relatedAchievements,
		relatedClaims,
		outstandingInvites
	};
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			error(403, m.lower_home_cow_view());

		// TODO: require confirmation for delete
		// TODO: ensure can't delete non-org achievement

		// Achievements that once required this achievement get their claimability reset.
		// Must run before the delete below: the self-relation FK is ON DELETE SET NULL,
		// so after deletion `claimRequiresId` would already be null and no longer match.
		const requiredAchievementReset = prisma.achievement.updateMany({
			where: {
				claimRequiresId: params.id
			},
			data: {
				claimRequiresId: null,
				claimable: false
			}
		});

		const credentialsDelete = prisma.achievementCredential.deleteMany({
			where: {
				achievementId: params.id
			}
		});

		const achievementClaimsDelete = prisma.achievementClaim.deleteMany({
			where: {
				achievementId: params.id
			}
		});

		const claimEndorsementDelete = prisma.claimEndorsement.deleteMany({
			where: {
				achievementId: params.id
			}
		});

		const achievementDelete = prisma.achievement.deleteMany({
			where: {
				id: params.id
			}
		});

		// Clean up organization permissions that reference this achievement
		let orgPermissionCleanup = undefined;
		// Check if the org's permissions point to this achievement
		if (
			locals.org?.json?.permissions?.editAchievementCapability?.requiresAchievement === params.id
		) {
			const newJson = JSON.parse(JSON.stringify(locals.org.json)) as App.OrganizationConfig;
			if (newJson.permissions && newJson.permissions.editAchievementCapability) {
				newJson.permissions.editAchievementCapability.requiresAchievement = null;
			}
			orgPermissionCleanup = prisma.organization.update({
				where: { id: locals.org.id },
				data: { json: newJson }
			});
		}

		await prisma.$transaction([
			requiredAchievementReset,
			credentialsDelete,
			achievementClaimsDelete,
			claimEndorsementDelete,
			achievementDelete,
			...(orgPermissionCleanup ? [orgPermissionCleanup] : [])
		]);

		redirect(303, '/achievements');
	}
};
