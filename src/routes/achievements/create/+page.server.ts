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
		let formData = {
			name: stripTags(requestData.get('name')?.toString()) || '',
			description: stripTags(requestData.get('description')?.toString()) || '',
			criteriaId: requestData.get('url')?.toString(),
			criteriaNarrative: stripTags(requestData.get('criteriaNarrative')?.toString()),
			category: stripTags(requestData.get('category')?.toString()),

			claimable: requestData.get('claimable')?.toString(), // 'on' or 'off'
			claimRequires: requestData.get('claimRequires')?.toString(),
			reviewRequires: requestData.get('reviewRequires')?.toString(),
			reviewsRequired: parseInt(requestData.get('reviewsRequired')?.toString() || '') || 0,
			reviewableSelectedOption: requestData.get('reviewableSelectedOption')?.toString() || 'none',
			capabilities_inviteRequires:
				requestData.get('capabilities_inviteRequires')?.toString() || null
		};

		try {
			await achievementFormSchema.validate(formData);
		} catch (err) {
			if (err instanceof ValidationError) throw error(400, err.message);
		}

		const achievementData = {
			id: newIdentifier,
			identifier: `urn:uuid:${newIdentifier}`,
			name: formData.name,
			organization: { connect: { id: locals.org.id } },
			description: formData.description,
			criteriaId: formData.criteriaId,
			criteriaNarrative: formData.criteriaNarrative,
			image: imageKey,
			json: {},
			category:
				formData.category != 'uncategorized' ? { connect: { id: formData.category } } : undefined,
			achievementConfig: {
				create: {
					organization: { connect: { id: locals.org.id } },
					claimable: formData.claimable == 'on',
					claimRequires: formData.claimRequires
						? { connect: { id: formData.claimRequires } }
						: undefined,
					reviewRequires: formData.reviewRequires
						? { connect: { id: formData.reviewRequires } }
						: undefined,
					reviewsRequired: formData.reviewsRequired,
					json: {
						capabilities: {
							inviteRequires: formData.capabilities_inviteRequires
						}
					}
				}
			}
		};

		// "Reviewed by an admin requires only one review, no matter what."
		if (formData.reviewableSelectedOption == 'admin')
			achievementData.achievementConfig.create['reviewsRequired'] = 1;

		if (achievementData.achievementConfig.create?.json.capabilities.inviteRequires) {
			const inviteRequiresAchievement = await prisma.achievement.findFirst({
				where: {
					organizationId: locals.org.id,
					id: achievementData.achievementConfig.create.json.capabilities.inviteRequires
				}
			});
			if (!inviteRequiresAchievement) {
				throw error(400, m.inviteRequires_notFound());
			}
		}

		const achievement = await prisma.achievement.create({
			data: achievementData,
			include: {
				achievementConfig: true
			}
		});

		const imageUploadUrl = imageKey ? await getUploadUrl(imageKey) : null;

		return {
			achievement,
			imageUploadUrl
		};
	}
};
