import * as m from '$lib/i18n/messages';
import { prisma } from '$lib/../prisma/client';
import type { ClaimEndorsement, User } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { canEditAchievements } from '$lib/server/permissions';

export const load: PageServerLoad = async ({ url, params, locals }) => {
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
			},
			achievementConfig: true
		}
	});

	const relatedAchievements = await prisma.achievement.findMany({
		where: {
			id: {
				in: [
					achievement?.achievementConfig?.claimRequiresId || 'N/A',
					achievement?.achievementConfig?.reviewRequiresId || 'None'
				]
			}
		},
		include: {
			achievementConfig: true
		}
	});

	// Get the existing claim(s) user has made for this badge,
	// or for the badge that is required to be eligible to claim this badge
	const relatedClaims = !!locals.session?.user?.id
		? await prisma.achievementClaim.findMany({
				where: {
					achievementId: {
						in: [achievementId, achievement?.achievementConfig?.claimRequiresId || 'N/A']
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
		achievement,
		relatedAchievements,
		relatedClaims,
		outstandingInvites
	};
};

export const actions: Actions = {
	delete: async ({ locals, params }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			throw error(403, m.lower_home_cow_view());

		// TODO: require confirmation for delete
		// TODO: ensure can't delete non-org achievement
		const configDelete = prisma.achievementConfig.deleteMany({
			where: {
				achievementId: params.id
			}
		});

		// Achievements that once required this achievement get their claimability reset
		const requiredConfigDelete = prisma.achievementConfig.deleteMany({
			where: {
				claimRequiresId: params.id
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
			configDelete,
			requiredConfigDelete,
			credentialsDelete,
			achievementClaimsDelete,
			claimEndorsementDelete,
			achievementDelete,
			...(orgPermissionCleanup ? [orgPermissionCleanup] : [])
		]);

		throw redirect(303, '/achievements');
	}
};
