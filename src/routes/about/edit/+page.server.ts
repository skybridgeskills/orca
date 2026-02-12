import * as m from '$lib/i18n/messages';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import * as dotenv from 'dotenv';
import { ValidationError } from 'yup';
import { formSchema } from './schema';
import { prisma } from '../../../prisma/client';
import type { PageServerLoad } from './$types';
import stripTags from '../../../lib/utils/stripTags';
import { getUploadUrl } from '$lib/server/media';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const getOrgStatus = (orgJson: App.OrganizationConfig): App.OrgStatus => {
	return orgJson.orgStatus ?? 'ENABLED';
};

export const load: PageServerLoad = ({ locals }) => {
	// redirect user if logged out or doesn't hold org admin role
	if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
		throw redirect(302, '/');
};

export const actions: Actions = {
	default: async ({ locals, cookies, request }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			throw error(403, m.lower_home_cow_view());

		const requestData = await request.formData();
		const imageUpdated = requestData.get('imageEdited') === 'true';
		const imageKey = requestData.get('imageExtension')
			? `org-${locals.org.id}/${uuidv4().slice(-8)}-raw-image.${requestData.get('imageExtension')}`
			: null;
		let formData = {
			name: stripTags(requestData.get('name')?.toString()),
			description: stripTags(requestData.get('description')?.toString()),
			url: requestData.get('url')?.toString(),
			primaryColor: requestData.get('primaryColor')?.toString(),
			...(imageUpdated ? { logo: imageKey } : null) // Only include the image field value if image is changed.
		};

		try {
			await formSchema.validate(formData);
		} catch (err) {
			if (err instanceof ValidationError) throw error(400, err.message);
		}

		// Get the tagline, defaultLanguage, and permissions from the form data
		const tagline = stripTags(requestData.get('tagline')?.toString() || '');
		const defaultLanguage = requestData.get('defaultLanguage')?.toString();
		const editAchievementCapability = requestData.get('editAchievementCapability')?.toString();
		const editAchievementRequires = requestData.get('editAchievementRequires')?.toString();

		// Parse the current json object
		const jsonData: App.OrganizationConfig =
			typeof locals.org?.json === 'string' ? JSON.parse(locals.org.json) : locals.org?.json || {};

		// Extract and preserve orgStatus (cannot be modified by users)
		const currentOrgStatus = getOrgStatus(jsonData);

		// Update the json object with the new tagline, defaultLanguage, and permissions
		const updatedJson: App.OrganizationConfig = {
			...jsonData,
			tagline: tagline,
			defaultLanguage: defaultLanguage || undefined,
			orgStatus: currentOrgStatus // Explicitly preserve orgStatus
		};

		// Handle edit achievement capability permissions
		if (editAchievementCapability === 'achievement' && editAchievementRequires) {
			// Validate that the achievement exists in this organization
			const achievement = await prisma.achievement.findFirst({
				where: {
					id: editAchievementRequires,
					organizationId: locals.org.id
				}
			});

			if (!achievement) {
				throw error(400, 'Selected achievement does not exist in this organization');
			}

			updatedJson.permissions = {
				...updatedJson.permissions,
				editAchievementCapability: {
					requiresAchievement: editAchievementRequires
				}
			};
		} else {
			// Clear the permission setting (default to admins only)
			if (updatedJson.permissions?.editAchievementCapability) {
				delete updatedJson.permissions.editAchievementCapability;
			}
		}

		await prisma.organization.update({
			where: {
				id: locals.org.id
			},
			data: {
				...formData,
				json: updatedJson
			}
		});
		const imageUploadUrl = imageUpdated && imageKey ? await getUploadUrl(imageKey) : '';

		return { imageUploadUrl };
	}
};
