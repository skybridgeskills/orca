import { DataIntegrityProof } from '@interop/data-integrity-proof';
import { eddsaRdfc2022 } from '@interop/ed25519-signature/eddsa-rdfc-2022';
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key';
import { issue, type VerifiableCredential } from '@interop/vc';
import type { Achievement, AchievementClaim, Organization, User, Identifier } from '@prisma/client';

import { buildAchievementCredentialTemplate } from '$lib/credentials/credentialTemplate';
import { MultikeyDID, OrganizationDID } from '$lib/credentials/did';
import { resolveActiveSigningKey } from '$lib/server/signingKey/resolver';

import { extendedDocumentLoader } from './documentLoader';

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
	// The Multikey verification-method id is the proof creator for new credentials
	// (DataIntegrityProof / eddsa-rdfc-2022). The signer reports `id: keyData.id`, so
	// `proof.verificationMethod` becomes the Multikey identifier.
	const verificationMethodDid = new MultikeyDID(organization, signingKey);
	const keyData = {
		id: verificationMethodDid.didString(),
		controller: organizationDid.didString(),
		privateKeyMultibase: signingKey.privateKeyMultibase,
		publicKeyMultibase: signingKey.publicKeyMultibase
	};

	const keyPair = await Ed25519VerificationKey.from(keyData);
	const suite = new DataIntegrityProof({
		signer: keyPair.signer(),
		cryptosuite: eddsaRdfc2022,
		date: new Date().toISOString()
	});

	// `issue()` mutates the credential in place, so sign a deep copy. With the VC 2.0
	// context present, `DataIntegrityProof.ensureSuiteContext` adds nothing, so no
	// suite context is appended to `@context`.
	const credentialCopy = structuredClone(credentialTemplate);

	// orca maintains its own OB3 credential types; cast at the @interop/vc
	// boundary, where the structural VC type differs only in fields irrelevant
	// to signing (e.g. `evidence`).
	const signedCredential = await issue({
		credential: credentialCopy as unknown as VerifiableCredential,
		suite,
		documentLoader: extendedDocumentLoader
	});

	return signedCredential as App.OpenBadgeCredential;
};
