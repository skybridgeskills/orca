import { redirect } from '@sveltejs/kit';
import { prisma } from '../../prisma/client';
import type { Actions, PageServerLoad } from './$types';
import { USE_SECURE_COOKIES } from '$env/static/private';

export const load: PageServerLoad = async () => {
	// we only use this endpoint for the api
	// and don't need to see the page
	redirect(302, '/');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		const sessionId = cookies.get('sessionId');
		// destroy the cookie
		cookies.set('sessionId', '', {
			path: '/',
			expires: new Date(0),
			secure: USE_SECURE_COOKIES == 'true'
		});

		if (sessionId) {
			await prisma.session.update({
				where: {
					id: sessionId
				},
				data: {
					valid: false,
					code: ''
				}
			});
		}

		// redirect the user
		redirect(302, '/login');
	}
};
