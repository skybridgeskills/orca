import * as m from '$lib/i18n/messages';
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '../../../../prisma/client';
import { Prisma } from '@prisma/client';
import stripTags from '../../../../lib/utils/stripTags';
import { ValidationError } from 'yup';
import { achievementFormSchema } from '$lib/data/achievementForm';
import { getUploadUrl } from '$lib/server/media';
import { v4 as uuidv4 } from 'uuid';

interface AchievementConfigForm {
	claimable: boolean;
	claimRequires?: { connect: { id: string } } | undefined;
	achievement: { connect: { id: string } };
	organization: { connect: { id: string } };
	reviewsRequired: number;
	reviewRequires?: { connect: { id: string } } | undefined;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	// redirect user if logged out or doesn't hold org admin role
	if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
		throw redirect(302, `/achievements/${params.id}`);

	const achievement = await prisma.achievement.findFirstOrThrow({
		where: {
			id: params.id,
			organizationId: locals.org.id
		},
		include: {
			category: true,
			achievementConfig: true
		}
	});

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
	default: async ({ locals, cookies, request, params }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			throw error(403, m.error_unauthorized());

		const requestData = await request.formData();
		const categoryId = stripTags(requestData.get('category')?.toString());

		const imageUpdated = requestData.get('imageEdited') === 'true';

		const imageKey = requestData.get('imageExtension')
			? `achievement-${params.id}/${uuidv4().slice(-8)}-raw-image.${requestData.get(
					'imageExtension'
			  )}`
			: null;

		const formData = {
			name: stripTags(requestData.get('name')?.toString()) || '',
			description: stripTags(requestData.get('description')?.toString()) || '',
			criteriaId: requestData.get('url')?.toString(),
			criteriaNarrative: stripTags(requestData.get('criteriaNarrative')?.toString()),
			...(imageUpdated ? { image: imageKey } : null), // Only include the image field value if image is changed.
			category:
				categoryId != 'uncategorized' ? { connect: { id: categoryId } } : { disconnect: true }
		};

		let configData: AchievementConfigForm = {
			claimable: requestData.get('config_claimable')?.toString() == 'on',
			organization: { connect: { id: locals.org.id } },
			achievement: { connect: { id: params.id } },
			reviewsRequired: parseInt(requestData.get('config_reviewsRequired')?.toString() || '') || 0
		};

		if (configData['claimable'] && !!requestData.get('config_achievementRequires')?.toString())
			configData['claimRequires'] = {
				connect: { id: requestData.get('config_achievementRequires')?.toString() || '' }
			};

		if (configData['claimable'] && !!requestData.get('config_reviewRequires')?.toString())
			configData['reviewRequires'] = {
				connect: { id: requestData.get('config_reviewRequires')?.toString() || '' }
			};

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
				reviewsRequired: configData.reviewsRequired
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
			data: formData
		});

		const imageUploadUrl = imageUpdated && imageKey ? await getUploadUrl(imageKey) : null;

		return {
			achievement: updated,
			imageUploadUrl
		};
	}
};
