import { json } from '@sveltejs/kit';
import { serviceDiscoveryDocumentForOrg } from '$lib/ob3/serviceDiscoveryDocument';
import type { RequestHandler } from './$types';

// Open Badges 3.0 Service Discovery Document (§6.3). Unprotected.
export const GET: RequestHandler = async ({ locals }) =>
	json(serviceDiscoveryDocumentForOrg(locals.org));
