import { error } from '@sveltejs/kit';
import * as dotenv from 'dotenv';
import { prisma } from '../../../prisma/client';

dotenv.config();

export async function GET({ url, locals }) {
	const requestUrl = new URL(new String(url).toString());
	const did = `did:web:${locals.org.domain}`;

	const signingKeys = await prisma.signingKey.findMany({
		where: {
			organizationId: locals.org.id
		},
		select: {
			publicKeyMultibase: true,
			revoked: true,
			privateKeyMultibase: false
		}
	});

	const verificationMethods = signingKeys.map((key) => {
		return {
			id: `${did}#key-0`,
			controller: did,
			revoked: key.revoked,
			type: 'Ed25519VerificationKey2020',
			publicKeyMultibase: key.publicKeyMultibase
		};
	});

	let data = {
		'@context': [
			'https://www.w3.org/ns/did/v1',
			'https://w3id.org/security/suites/ed25519-2020/v1'
		],
		id: did,
		verificationMethod: verificationMethods,
		assertionMethod: [`${did}#key-0`]
	};

	return new Response(JSON.stringify(data, null, 2));
}
