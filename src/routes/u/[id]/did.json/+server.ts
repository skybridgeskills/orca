import type { RequestEvent } from './$types';
import { json } from '@sveltejs/kit';

export async function GET({ url, locals, params }) {
	// TODO: This always returns data. Needs validation of the user-specific portion of the DID and validation that there is actually a user here, and verification that the user wanted to use the local did:web profile.
	const encodedUserId = params.id;
	const did = Buffer.from(encodedUserId, 'base64url').toString();

	let data = {
		'@context': 'https://www.w3.org/ns/did/v1',
		id: `did:web:${encodeURIComponent(locals.org.domain)}:u:${encodedUserId}`
	};

	return json(data);
}
