import jsigs from 'jsonld-signatures';
const {
	purposes: { AssertionProofPurpose }
} = jsigs;
import { extendedDocumentLoader } from './documentLoader';
import { prisma } from '../../prisma/client';
import {
	type Achievement,
	type Organization,
	type AchievementClaim,
	type User,
	type Identifier,
	IdentifierType
} from '@prisma/client';

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Required to set up a suite instance with private key
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
import { CredentialSubjectDID, KeyDID, OrganizationDID } from '$lib/credentials/did';

export const achievementClaimToCredential = async function (
	claim: AchievementClaim & {
		achievement: Achievement;
		user: User & { identifiers: Identifier[] };
	},
	organization: Organization
) {
	const generatedSubjectDid = new CredentialSubjectDID(organization, claim.user);
	const organizationDid = new OrganizationDID(organization);
	let credentialTemplate: App.OpenBadgeCredential = {
		'@context': [
			'https://www.w3.org/2018/credentials/v1',
			'https://purl.imsglobal.org/spec/ob/v3p0/context.json' // TODO -> 3.0.1... 3.0.2 soon
		],
		id: `urn:uuid:${claim.id}`,
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: {
			id: organizationDid.didString(),
			type: 'Profile',
			name: organization.name,
			email: organization.email,
			description: organization.description
		},
		issuanceDate: claim.validFrom?.toISOString() ?? new Date().toISOString(),
		credentialSubject: {
			id: generatedSubjectDid.didString(),
			type: 'AchievementSubject',
			achievement: {
				id: `https://${organization.domain}/achievements/${claim.achievement.id}`,
				type: 'Achievement',
				criteria: {
					narrative: claim.achievement.criteriaNarrative || ''
				},
				description: claim.achievement.description,
				name: claim.achievement.name
			}
		}
	};

	const salt = `${uuidv4()}`;
	const recipientEmail = claim.user.identifiers.find(
		(i) => i.type === IdentifierType.EMAIL
	)?.identifier;
	const identityObject = {
		type: 'IdentityObject',
		hashed: true,
		identityHash: createHash('sha256').update(`${recipientEmail}${salt}`).digest('hex'),
		identityType: 'emailAddress',
		salt: salt
	};
	credentialTemplate['credentialSubject'] = {
		...credentialTemplate['credentialSubject'],
		identifier: [identityObject]
	};

	let signingKey = await prisma.signingKey.findFirstOrThrow({
		where: {
			organizationId: organization.id
		}
	});
	const keyDid = new KeyDID(organization, signingKey);
	const keyData = {
		id: keyDid.didString(),
		controller: organizationDid.didString(),
		privateKeyMultibase: signingKey.privateKeyMultibase,
		publicKeyMultibase: signingKey.publicKeyMultibase
	};

	const keyPair = await Ed25519VerificationKey2020.from(keyData);

	const suite = new Ed25519Signature2020({ 
		key: keyPair,
		date: new Date().toISOString()
	}); //might need to use signer param

	const signedCredential = await jsigs.sign(credentialTemplate, {
		suite,
		purpose: new AssertionProofPurpose(),
		documentLoader: extendedDocumentLoader
	} as any);

	return signedCredential as App.OpenBadgeCredential;
};
