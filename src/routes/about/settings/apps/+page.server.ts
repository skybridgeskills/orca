import { error, fail, redirect } from '@sveltejs/kit';

import * as m from '$lib/i18n/messages';
import { isGeneralAdmin } from '$lib/permissions/isAdmin';
import {
	ConfidentialClientError,
	createConfidentialClient,
	deleteConfidentialClient,
	disableConfidentialClient,
	listConfidentialClients
} from '$lib/server/oauth/confidentialClients';
import { API_SCOPES } from '$lib/server/oauth/scopes';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// These are sensitive integration credentials — gate on GENERAL_ADMIN only
	// (not the broader isAdmin helper, which also allows CONTENT_ADMIN).
	if (!isGeneralAdmin(locals.session?.user)) {
		redirect(302, '/');
	}

	const apps = await listConfidentialClients(locals.org);

	return {
		apps: apps.map((a) => ({
			id: a.id,
			clientId: a.clientId,
			clientName: a.clientName,
			clientUri: a.clientUri,
			scopes: a.scopes,
			disabledAt: a.disabledAt ? a.disabledAt.toISOString() : null,
			createdAt: a.createdAt.toISOString(),
			lastUsedAt: a.lastUsedAt ? a.lastUsedAt.toISOString() : null
		})),
		// Expose the scope taxonomy so the UI can offer checkboxes and visually
		// distinguish active scopes from reserved-for-later ones.
		supportedScopes: API_SCOPES.map((s) => ({ scope: s.scope, enforced: s.enforced }))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!isGeneralAdmin(locals.session?.user)) {
			error(403, m.stern_lunar_bear_deny());
		}

		const formData = await request.formData();
		const clientName = formData.get('clientName')?.toString().trim() ?? '';
		const clientUri = formData.get('clientUri')?.toString().trim() || undefined;
		const scopes = formData.getAll('scopes').map((s) => s.toString());

		if (!clientName) {
			return fail(400, { createError: m.royal_teal_mole_name() });
		}

		try {
			const { client, clientSecret } = await createConfidentialClient({
				org: locals.org,
				// The creating admin becomes the app's owner / accountable actor
				// (Option B): their id is what future write scopes attribute as creator.
				createdByUserId: locals.session!.user!.id,
				clientName,
				clientUri,
				scopes
			});

			// Reveal the raw clientId + clientSecret ONCE via the action result. The
			// secret is never persisted server-side or logged (only its scrypt hash).
			return { created: { clientId: client.clientId, clientSecret } };
		} catch (err) {
			if (err instanceof ConfidentialClientError) {
				return fail(400, { createError: m.eager_navy_swan_scope() });
			}
			throw err;
		}
	},

	disable: async ({ request, locals }) => {
		if (!isGeneralAdmin(locals.session?.user)) {
			error(403, m.stern_lunar_bear_deny());
		}

		const formData = await request.formData();
		const clientInternalId = formData.get('clientInternalId')?.toString();
		if (!clientInternalId) {
			return fail(400);
		}

		// disableConfidentialClient is org- and CONFIDENTIAL_SERVICE-scoped, so it
		// only ever touches this org's service clients (and revokes their tokens).
		await disableConfidentialClient(locals.org, clientInternalId);

		return { disabled: true };
	},

	delete: async ({ request, locals }) => {
		if (!isGeneralAdmin(locals.session?.user)) {
			error(403, m.stern_lunar_bear_deny());
		}

		const formData = await request.formData();
		const clientInternalId = formData.get('clientInternalId')?.toString();
		if (!clientInternalId) {
			return fail(400);
		}

		// Soft delete: org- and CONFIDENTIAL_SERVICE-scoped. The history row stays
		// in the DB (hidden from the list); tokens are revoked and the client can
		// no longer authenticate (verifyClient rejects deletedAt).
		await deleteConfidentialClient(locals.org, clientInternalId);

		return { deleted: true };
	}
};
