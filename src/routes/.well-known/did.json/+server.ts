import * as dotenv from 'dotenv';

import { MULTIKEY_VERIFICATION_METHOD_FRAGMENT } from '$lib/credentials/did';

import { prisma } from '../../../prisma/client';

dotenv.config();

export async function GET({ locals }) {
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

	// Express each signing key both ways: the unchanged `#key-0`
	// `Ed25519VerificationKey2020` method (for verifying outstanding
	// Ed25519Signature2020 credentials) and a new `#key-0-multikey` `Multikey` method
	// (the proof creator for DataIntegrityProof / eddsa-rdfc-2022 credentials).
	const verificationMethods = signingKeys.flatMap((key) => [
		{
			id: `${did}#key-0`,
			controller: did,
			revoked: key.revoked,
			type: 'Ed25519VerificationKey2020',
			publicKeyMultibase: key.publicKeyMultibase
		},
		{
			id: `${did}#${MULTIKEY_VERIFICATION_METHOD_FRAGMENT}`,
			controller: did,
			revoked: key.revoked,
			type: 'Multikey',
			publicKeyMultibase: key.publicKeyMultibase
		}
	]);

	const data = {
		'@context': [
			'https://www.w3.org/ns/did/v1',
			'https://w3id.org/security/suites/ed25519-2020/v1',
			'https://w3id.org/security/multikey/v1'
		],
		id: did,
		verificationMethod: verificationMethods,
		assertionMethod: [`${did}#key-0`, `${did}#${MULTIKEY_VERIFICATION_METHOD_FRAGMENT}`]
	};

	return new Response(JSON.stringify(data, null, 2));
}
