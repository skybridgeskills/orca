import { json } from '@sveltejs/kit';

export async function GET({ locals, params }) {
	// TODO: This always returns data. Needs validation of the user-specific portion of the DID and validation that there is actually a user here, and verification that the user wanted to use the local did:web profile.
	const encodedUserId = params.id;

	const data = {
		'@context': 'https://www.w3.org/ns/did/v1',
		id: `did:web:${encodeURIComponent(locals.org.domain)}:u:${encodedUserId}`
	};

	return json(data);
}
