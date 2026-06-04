import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import type { Achievement, AchievementClaim, Organization, User, Identifier } from '@prisma/client';
import jsigs from 'jsonld-signatures';

import { buildAchievementCredentialTemplate } from '$lib/credentials/credentialTemplate';
import { KeyDID, OrganizationDID } from '$lib/credentials/did';
import { resolveActiveSigningKey } from '$lib/server/signingKey/resolver';

import { extendedDocumentLoader } from './documentLoader';

const {
	purposes: { AssertionProofPurpose }
} = jsigs;

export const achievementClaimToCredential = async function (
	claim: AchievementClaim & {
		achievement: Achievement;
		user: User & { identifiers: Identifier[] };
	},
	organization: Organization
) {
	const credentialTemplate = buildAchievementCredentialTemplate(claim, organization);
	const signingKey = await resolveActiveSigningKey(organization as App.Organization);
	const organizationDid = new OrganizationDID(organization);
	const keyDid = new KeyDID(organization, signingKey);
	const keyData = {
		id: keyDid.didString(),
		controller: organizationDid.didString(),
		privateKeyMultibase: signingKey.privateKeyMultibase,
		publicKeyMultibase: signingKey.publicKeyMultibase
	};

	const keyPair = await Ed25519VerificationKey2020.from(keyData);

	const suite = new Ed25519Signature2020({ key: keyPair }); //might need to use signer param
	// Set date as property (not in type definition but works at runtime)
	(suite as any).date = new Date().toISOString();

	const signedCredential = await jsigs.sign(credentialTemplate, {
		suite,
		purpose: new AssertionProofPurpose(),
		documentLoader: extendedDocumentLoader
	} as any);

	return signedCredential as App.OpenBadgeCredential;
};
