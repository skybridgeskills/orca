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
		throw redirect(302, '/');

	return {
		organization: locals.org
	};
};

export const actions: Actions = {
	default: async ({ locals, cookies, request }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			throw error(403, m.error_unauthorized());

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

		await prisma.organization.update({
			where: {
				id: locals.org.id
			},
			data: formData
		});

		const imageUploadUrl = imageUpdated && imageKey ? await getUploadUrl(imageKey) : '';

		return { imageUploadUrl };
	}
};
