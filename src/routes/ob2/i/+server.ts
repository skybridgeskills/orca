import { json, redirect } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { issuerFromOrganization } from '$lib/ob2/issuer';

// The OB 2.0 issuer profile endpoint for the organization
export const GET = async ({ locals, request }: RequestEvent) => {
	if (request.headers.get('Accept')?.toLowerCase().includes('text/html'))
		throw redirect(302, `/about`);

	return json(issuerFromOrganization(locals.org));
};
