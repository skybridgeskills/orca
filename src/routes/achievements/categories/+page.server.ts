import * as m from '$lib/i18n/messages';
import { prisma } from '../../../prisma/client';
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import stripTags from '../../../lib/utils/stripTags';
import parseIntData from '../../../lib/utils/parseIntData';

export const load: PageServerLoad = ({ params, locals }) => {
	// Don't include edit controls if not an admin
	if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
		throw redirect(302, `/achievements`);
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			throw error(403, 'Unauthorized');

		const requestData = await request.formData();
		const formData = {
			name: stripTags(requestData.get('create_categoryName')?.toString()) || '',
			weight: parseIntData(requestData.get('create_weight')?.toString() || ''),
			organization: { connect: { id: locals.org.id } }
		};

		// try {
		//     await achievementFormSchema.validate(formData)
		// }
		// catch (err) {
		//     if (err instanceof ValidationError)
		//         throw error(400, err.message)
		// }

		const category = await prisma.achievementCategory.create({
			data: formData
		});

		return { ...category, _count: { achievements: 0 } };
	},

	update: async ({ locals, cookies, request, params }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			throw error(403, m.error_unauthorized());

		const requestData = await request.formData();
		const categoryId = stripTags(requestData.get('update_categoryId')?.toString()) || '';
		const categoryName = stripTags(requestData.get('update_categoryName')?.toString()) || '';
		const categoryWeight = parseIntData(requestData.get('update_weight')?.toString() || '');

		// Can only search by unique inputs on update, so verify first this category is in this org
		const existingCategory = await prisma.achievementCategory.findFirstOrThrow({
			where: {
				organization: locals.org,
				id: categoryId
			}
		});

		const updatedCategory = await prisma.achievementCategory.update({
			where: { id: categoryId },
			data: {
				name: categoryName,
				weight: categoryWeight
			}
		});

		return updatedCategory;
	},

	delete: async ({ locals, cookies, request, params }) => {
		if (!['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(locals.session?.user?.orgRole || 'none'))
			throw error(403, m.error_unauthorized());

		const requestData = await request.formData();
		const categoryId = stripTags(requestData.get('delete_categoryId')?.toString()) || '';

		// Can only search by unique inputs on update, so verify first this category is in this org
		const existingCategory = await prisma.achievementCategory.findFirstOrThrow({
			where: {
				organization: locals.org,
				id: categoryId
			}
		});

		const deleteCategory = await prisma.achievementCategory.delete({
			where: { id: categoryId }
		});

		return deleteCategory;
	}
};
