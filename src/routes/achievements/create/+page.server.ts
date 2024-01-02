import * as m from '$lib/i18n/messages';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import * as dotenv from 'dotenv';
import { ValidationError } from 'yup';
import { achievementFormSchema } from '$lib/data/achievementForm';
import { prisma } from '$lib/../prisma/client';
import type { Prisma } from '@prisma/client';
import type { PageServerLoad } from './$types';
//import { getUploadUrl } from '$lib/server/media';
import stripTags from '$lib/utils/stripTags';
import { v4 as uuidv4 } from 'uuid';
import { connect } from 'http2';
import { getUploadUrl } from '$lib/server/media';

dotenv.config();

export const load: PageServerLoad = async ({ locals }) => {
	// redirect user if logged out or doesn't hold org admin role
	if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
		throw redirect(302, '/achievements');

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
		categories: categories
	};
};

export const actions: Actions = {
	default: async ({ locals, cookies, request }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			throw error(403, m.error_unauthorized());

		const newIdentifier = uuidv4();
		const requestData = await request.formData();
		const imageKey = requestData.get('imageExtension')
			? `achievement-${newIdentifier}/raw-image.${requestData.get('imageExtension')}`
			: null;
		let formData: Prisma.AchievementCreateInput = {
			id: newIdentifier,
			name: stripTags(requestData.get('name')?.toString()) || '',
			description: stripTags(requestData.get('description')?.toString()) || '',
			criteriaId: requestData.get('url')?.toString(),
			criteriaNarrative: stripTags(requestData.get('criteriaNarrative')?.toString()),
			organization: { connect: { id: locals.org.id } },
			json: '',
			identifier: `urn:uuid:${newIdentifier}`,
			image: imageKey,
			achievementConfig: {
				create: {
					organization: { connect: { id: locals.org.id } },
					claimable: requestData.get('config_claimable')?.toString() == 'on',
					reviewsRequired:
						parseInt(requestData.get('config_reviewsRequired')?.toString() || '') || 0
				}
			}
		};

		if (
			formData.achievementConfig?.create?.claimable &&
			!!requestData.get('config_achievementRequires')?.toString()
		)
			formData.achievementConfig.create['claimRequires'] = {
				connect: { id: requestData.get('config_achievementRequires')?.toString() || '' }
			};

		if (
			formData.achievementConfig?.create?.claimable &&
			!!requestData.get('config_reviewRequires')?.toString()
		)
			formData.achievementConfig.create['reviewRequires'] = {
				connect: { id: requestData.get('config_reviewRequires')?.toString() || '' }
			};

		const categoryId = stripTags(requestData.get('category')?.toString());
		if (categoryId && categoryId != 'uncategorized')
			formData.category = { connect: { id: categoryId } };

		try {
			await achievementFormSchema.validate(formData);
		} catch (err) {
			if (err instanceof ValidationError) throw error(400, err.message);
		}

		const achievement = await prisma.achievement.create({
			data: formData
		});

		const imageUploadUrl = imageKey ? await getUploadUrl(imageKey) : null;

		return {
			achievement,
			imageUploadUrl
		};
	}
};
