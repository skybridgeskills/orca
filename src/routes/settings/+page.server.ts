import type { Visibility } from '@prisma/client';
import { error, redirect } from '@sveltejs/kit';

import * as m from '$lib/i18n/messages';
import { emailNotificationsEnabled, setEmailNotifications } from '$lib/server/notificationPrefs';
import { isVisibility } from '$lib/server/visibility';
import stripTags from '$lib/utils/stripTags';

import { prisma } from '../../prisma/client';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// redirect user if logged out or doesn't hold org admin role
	if (!locals.session?.user?.id) redirect(302, `/`);

	// Passkeys are PASSKEY-type Identifiers; surface only safe display metadata for the
	// Passkeys section (never publicKey/counter). Identifier has no createdAt column, so
	// verifiedAt (set at registration) stands in as the created timestamp.
	const passkeyRows = await prisma.identifier.findMany({
		where: {
			userId: locals.session.user.id,
			organizationId: locals.org.id,
			type: 'PASSKEY'
		}
	});
	const passkeys = passkeyRows.map((row) => {
		const credential = row.json as App.PasskeyCredential;
		return {
			id: row.id,
			label: credential.label,
			deviceType: credential.deviceType ?? null,
			createdAt: row.verifiedAt,
			lastUsedAt: credential.lastUsedAt ?? null
		};
	});

	return {
		emailNotifications: emailNotificationsEnabled(locals.session.user.json),
		passkeys
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		if (!locals.session?.user?.id) error(403, m.silly_top_marten_view());

		const requestData = await request.formData();
		const givenName: string = requestData.get('givenName')?.toString() ?? '';
		const familyName: string = requestData.get('familyName')?.toString() ?? '';
		const defaultVisibilityRaw = requestData.get('defaultVisibility')?.toString();
		const defaultVisibility: Visibility = isVisibility(defaultVisibilityRaw)
			? defaultVisibilityRaw
			: 'COMMUNITY';
		const identifierVisibilityRaw = requestData.get('identifierVisibility')?.toString();
		const identifierVisibility: Visibility = isVisibility(identifierVisibilityRaw)
			? identifierVisibilityRaw
			: 'COMMUNITY';
		// Profile/member-directory visibility (separate from defaultVisibility, which is
		// claim visibility). Governs whether other members can see/open this profile.
		const profileVisibilityRaw = requestData.get('profileVisibility')?.toString();
		const profileVisibility: Visibility = isVisibility(profileVisibilityRaw)
			? profileVisibilityRaw
			: 'COMMUNITY';

		// Email notification preference (default on); merge into User.json, preserving
		// any other keys.
		const emailNotifications = requestData.get('emailNotifications') === 'on';
		const json = setEmailNotifications(locals.session.user.json, emailNotifications);

		const user = await prisma.user.update({
			where: { id: locals.session.user.id },
			data: {
				givenName,
				familyName,
				defaultVisibility,
				profileVisibility,
				json
			},
			include: {
				identifiers: true
			}
		});

		// Passkeys are authenticators, never contact identifiers: ignore PASSKEY rows when
		// reading/writing the contact-identifier visibility, so a passkey can never be
		// treated as the user's contact identifier.
		const contactIdentifier = user.identifiers.find((i) => i.type !== 'PASSKEY');
		if (identifierVisibility !== contactIdentifier?.visibility) {
			await prisma.identifier.updateMany({
				where: { userId: locals.session.user.id, type: { not: 'PASSKEY' } },
				data: { visibility: identifierVisibility }
			});

			// The identifiers returned from the updateMany above are a BatchResult not a GetResult and can't be used
			// to augment the user previously fetched, so we'll fetch user again.
			locals.session.user = await prisma.user.findUnique({
				where: { id: locals.session.user.id },
				include: { identifiers: true }
			});
		} else {
			locals.session.user = user;
		}

		return locals.session.user;
	},

	// Rename a passkey: update json.label only, scoped to the current user + org +
	// PASSKEY type so a user can never touch another user's (or another type's) row.
	renamePasskey: async ({ locals, request }) => {
		if (!locals.session?.user?.id) error(403, m.silly_top_marten_view());

		const requestData = await request.formData();
		const id = requestData.get('id')?.toString() ?? '';
		const label = stripTags(requestData.get('label')?.toString() ?? '');

		const row = await prisma.identifier.findFirst({
			where: {
				id,
				userId: locals.session.user.id,
				organizationId: locals.org.id,
				type: 'PASSKEY'
			}
		});
		if (!row) error(404, m.zesty_calm_finch_falter());

		const credential = row.json as App.PasskeyCredential;
		await prisma.identifier.update({
			where: { id: row.id },
			data: { json: { ...credential, label: label || credential.label } }
		});

		return { ok: true };
	},

	// Delete a passkey by id, scoped to the current user + org + PASSKEY type.
	deletePasskey: async ({ locals, request }) => {
		if (!locals.session?.user?.id) error(403, m.silly_top_marten_view());

		const requestData = await request.formData();
		const id = requestData.get('id')?.toString() ?? '';

		await prisma.identifier.deleteMany({
			where: {
				id,
				userId: locals.session.user.id,
				organizationId: locals.org.id,
				type: 'PASSKEY'
			}
		});

		return { ok: true };
	}
};
