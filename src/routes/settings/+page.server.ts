import * as m from '$lib/i18n/messages';
import { fail } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { prisma } from '../../prisma/client';
import { Prisma, Visibility, Passkey } from '@prisma/client';
import type { Actions, PageServerLoad } from './$types';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'domain';


export const load: PageServerLoad = async ({ locals, params }) => {
	// redirect user if logged out or doesn't hold org admin role
	if (!locals.session?.user?.id) throw redirect(302, `/`);

	const passkeys = await prisma.passkey.findMany({
		where: { 
			userId: locals.session.user.id,
			organizationId: locals.org.id
		 },
	});

	return {
		passkeys
	}
};

export const actions: Actions = {
	save: async ({ locals, cookies, request, params }) => {
		if (!locals.session?.user?.id) throw error(403, m.member_settingsChangeUnauthenticedError());

		const requestData = await request.formData();
		const givenName: string = requestData.get('givenName')?.toString() ?? '';
		const familyName: string = requestData.get('familyName')?.toString() ?? '';
		const defaultVisibility: Visibility =
			(requestData.get('defaultVisibility')?.toString() as Visibility) ?? 'COMMUNITY'; // Todo validate
		const identifierVisibility: Visibility =
			(requestData.get('identifierVisibility')?.toString() as Visibility) ?? 'COMMUNITY'; // Todo validate


		
		const user = await prisma.user.update({
			where: { id: locals.session.user.id },
			data: {
				givenName,
				familyName,
				defaultVisibility
			},
			include: {
				identifiers: true,
			}
		});

		if (identifierVisibility !== user.identifiers.find((i) => true)?.visibility) {
			await prisma.identifier.updateMany({
				where: { userId: locals.session.user.id },
				data: { visibility: identifierVisibility }
			});

			// The identifiers returned from the updateMany above are a BatchResult not a GetResult and can't be used
			// to augment the user previously fetched, so we'll fetch user again.
			locals.session.user = await prisma.user.findUnique({
				where: { id: locals.session.user.id },
				include: { identifiers: true} 
			});
		} else {
			locals.session.user = user;
		}


		return {
			user: locals.session.user,
		}
	},

	savePasskey: async ({ locals, cookies, request, params }) => {
		if (!locals.session?.user?.id) throw error(403, m.member_settingsChangeUnauthenticedError());

		const requestData = await request.formData();
		const createPasskey = requestData.get('newPasskey')?.toString() ?? "";
		if(createPasskey) {
			const newIdentifier = uuidv4();
			type PasskeyInput = Prisma.PasskeyCreateInput;

			const passkey_data = JSON.parse(createPasskey)
			let data: PasskeyInput =
						{ id: newIdentifier, //hm: already does this by default, you don't need to do it again
						passkeyId: passkey_data["registration"]["credential"]["id"],
						json: passkey_data, 
						user: { connect: { id: locals.session.user?.id} },
						organization: { connect: { id: locals.org.id } }
					}
	
			const passkeyCreated = await prisma.passkey.create({ data });
			return { 
				success: true, 
				passkey: passkeyCreated 
			};
		} 	
		// todo put some console logging in or get a breakpoint happening.
		return fail(500, {message: 'Passkey creation failed'});
	},

	deletePasskey: async ({ locals, cookies, request, params }) => {
		const requestData = await request.formData();
		const passkeyID = requestData.get('delpasskeyID')?.toString() ?? "";

		if (passkeyID) {
			const passkeyDeleted = await prisma.passkey.delete({
				where: {
					id: passkeyID
				}
				
				})
				return { 
					success: true, 
					passkey: passkeyDeleted
				};

		}

		return fail(500, {message: passkeyID});
	}
};
