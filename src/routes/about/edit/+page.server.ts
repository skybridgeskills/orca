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

export const load: PageServerLoad = ({ locals }) => {
	// redirect user if logged out or doesn't hold org admin role
	if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
		redirect(302, '/');
};

export const actions: Actions = {
	default: async ({ locals, cookies, request }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			error(403, m.error_unauthorized());

		const requestData = await request.formData();
		const imageUpdated = requestData.get('imageEdited')?.toString() === 'true';
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
			if (err instanceof ValidationError) error(400, err.message);
		}

		// Get the tagline from the form data
		const tagline = stripTags(requestData.get('tagline')?.toString() || '');

		// Parse the current json object
		const jsonData: App.OrganizationConfig =
			typeof locals.org?.json === 'string' ? JSON.parse(locals.org.json) : locals.org?.json || {};

		// Update the json object with the new tagline
		const updatedJson: App.OrganizationConfig = {
			...jsonData,
			tagline: tagline
		};

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
