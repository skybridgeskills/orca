import * as m from '$lib/i18n/messages';
import type { Actions } from './$types';
import { error, fail, json, redirect } from '@sveltejs/kit';
import { prisma } from '../../../../prisma/client';
import type { Achievement } from '@prisma/client';
import { Prisma } from '@prisma/client';
import stripTags from '../../../../lib/utils/stripTags';
import { ValidationError } from 'yup';
import { achievementFormSchema } from '$lib/data/achievementForm';
import { getUploadUrl } from '$lib/server/media';
import { v4 as uuidv4 } from 'uuid';
import { getAchievement } from '$lib/data/achievement';
import { canEditAchievements } from '$lib/server/permissions';

interface AchievementConfigForm {
	claimable: boolean;
	claimRequires?: { connect: { id: string } } | undefined;
	achievement: { connect: { id: string } };
	organization: { connect: { id: string } };
	reviewsRequired: number;
	reviewRequires?: { connect: { id: string } } | undefined;
	json?: {
		capabilities: {
			inviteRequires: string | null;
		};
		claimTemplate: string;
	};
}

export const load = async ({ locals, params }) => {
	// redirect user if logged out or doesn't have permission to edit achievements
	if (!locals.session?.user?.id) {
		throw redirect(302, `/achievements/${params.id}`);
	}

	const hasPermission = await canEditAchievements({
		user: {
			id: locals.session.user.id,
			orgRole: locals.session.user.orgRole
		},
		org: {
			id: locals.org.id,
			json: locals.org.json
		}
	});

	if (!hasPermission) {
		throw redirect(302, `/achievements/${params.id}`);
	}

	const achievement = (await prisma.achievement.findFirstOrThrow({
		where: {
			id: params.id,
			organizationId: locals.org.id
		},
		include: {
			achievementConfig: true
		}
	})) as Achievement & { achievementConfig?: App.AchievementConfig };

	const categories = await prisma.achievementCategory.findMany({
		where: {
			organizationId: locals.org.id
		},
		orderBy: {
			weight: 'desc'
		}
	});

	return {
		organization: locals.org,
		achievement: achievement,
		categories: categories
	};
};

export const actions: Actions = {
	default: async ({ locals, request, params }) => {
		if (!locals.session?.user?.id) {
			throw error(403, m.error_unauthorized());
		}

		const hasPermission = await canEditAchievements({
			user: {
				id: locals.session.user.id,
				orgRole: locals.session.user.orgRole
			},
			org: {
				id: locals.org.id,
				json: locals.org.json
			}
		});

		if (!hasPermission) {
			throw error(403, m.error_unauthorized());
		}

		const requestData = await request.formData();
		const imageUpdated = requestData.get('imageEdited') === 'true';
		const imageKey = requestData.get('imageExtension')
			? `achievement-${params.id}/${uuidv4().slice(-8)}-raw-image.${requestData.get(
					'imageExtension'
			  )}`
			: null;

		const formData = {
			// Properties for Achievement
			name: stripTags(requestData.get('name')?.toString()) || '',
			description: stripTags(requestData.get('description')?.toString()) || '',
			criteriaId: requestData.get('url')?.toString(),
			criteriaNarrative: stripTags(requestData.get('criteriaNarrative')?.toString()),

			category: stripTags(requestData.get('category')?.toString()),

			// Properties for AchievmentConfig
			capabilities_inviteRequires:
				requestData.get('capabilities_inviteRequires')?.toString() || null,
			claimable: requestData.get('claimable')?.toString(), // 'on' or 'off'
			claimableSelectedOption: requestData.get('claimableSelectedOption')?.toString(), // 'off', 'badge', or 'public'
			claimRequires: requestData.get('claimRequires')?.toString(),
			reviewRequires: requestData.get('reviewRequires')?.toString(),
			reviewsRequired: parseInt(requestData.get('reviewsRequired')?.toString() || '') || 0,
			reviewableSelectedOption: requestData.get('reviewableSelectedOption')?.toString() || 'none'
		};

		// read claim template enabled flag and claimTemplate value
		const claimTemplate_enabled =
			(requestData.get('claimTemplate_enabled')?.toString() || 'off') === 'on';
		const rawClaimTemplate = stripTags(requestData.get('claimTemplate')?.toString() || '');
		const claimTemplate = claimTemplate_enabled ? rawClaimTemplate : '';
		const achievementData = {
			name: formData.name,
			description: formData.description,
			criteriaId: formData.criteriaId,
			criteriaNarrative: formData.criteriaNarrative,
			...(imageUpdated ? { image: imageKey } : null), // Only include the image field value if image is changed.
			category:
				formData.category != 'uncategorized'
					? { connect: { id: formData.category } }
					: { disconnect: true }
		};

		let configData: AchievementConfigForm = {
			claimable: formData.claimable == 'on',
			organization: { connect: { id: locals.org.id } },
			achievement: { connect: { id: params.id } },
			reviewsRequired: formData.reviewsRequired
		};

		if (
			configData['claimable'] &&
			formData.claimableSelectedOption == 'badge' &&
			!!formData.claimRequires
		)
			configData['claimRequires'] = {
				connect: { id: formData.claimRequires }
			};
		else configData['claimRequires'] = undefined;

		if (configData['reviewsRequired'] > 0 && !!formData.reviewRequires)
			configData['reviewRequires'] = {
				connect: { id: formData.reviewRequires || '' }
			};
		else if (configData['reviewsRequired'] == 0) configData['reviewRequires'] = undefined;

		if (formData.capabilities_inviteRequires) {
			try {
				const relatedInviteRequiresAchievement = await getAchievement(
					formData.capabilities_inviteRequires,
					locals.org.id
				);
			} catch (e) {
				return fail(400, {
					code: 'inviteRequires',
					message: m.claimConfiguration_relatedAchievementNotFoundError()
				});
			}
		}
		configData['json'] = {
			capabilities: {
				inviteRequires: formData.capabilities_inviteRequires
			},
			claimTemplate
		};

		// "Reviewed by an admin requires only one review, no matter what."
		if (formData.reviewableSelectedOption == 'admin') configData['reviewsRequired'] = 1;

		try {
			await achievementFormSchema.validate(formData);
		} catch (err) {
			if (err instanceof ValidationError) return fail(400, { message: err.message });
		}

		// If achievement is not claimable, don't allow claimRequires to be set to anything.
		if (!configData.claimable && !!configData.claimRequires?.connect.id)
			configData.claimRequires = undefined;

		const upsertData = {
			where: {
				achievementId: params.id
			},
			update: {
				claimable: configData.claimable,
				claimRequires: !!configData.claimRequires ? configData.claimRequires : { disconnect: true },
				reviewRequires: !!configData.reviewRequires
					? configData.reviewRequires
					: { disconnect: true },
				reviewsRequired: configData.reviewsRequired,
				json: configData.json
			},
			create: configData
		};
		// TODO update records in a transaction
		try {
			const achievementConfig = await prisma.achievementConfig.upsert(upsertData);
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError) {
				if (e.code == 'P2025') {
					return fail(400, {
						code: 'claimRequires',
						message: m.claimConfiguration_relatedAchievementNotFoundError()
					});
				}
			}
			throw error(500, m.claimConfiguration_unexpectedSaveError());
		}

		const updated = await prisma.achievement.update({
			where: {
				id: params.id,
				organizationId: locals.org.id
			},
			include: {
				category: true,
				achievementConfig: true
			},
			data: achievementData
		});

		const imageUploadUrl = imageUpdated && imageKey ? await getUploadUrl(imageKey) : null;

		return {
			achievement: updated,
			imageUploadUrl
		};
	}
};
