import { Ed25519Signature2020 } from '@interop/ed25519-signature/ed25519-signature-2020';
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key';
import { issue, type VerifiableCredential } from '@interop/vc';
import type { Achievement, AchievementClaim, Organization, User, Identifier } from '@prisma/client';

import { buildAchievementCredentialTemplate } from '$lib/credentials/credentialTemplate';
import { KeyDID, OrganizationDID } from '$lib/credentials/did';
import { resolveActiveSigningKey } from '$lib/server/signingKey/resolver';

import { extendedDocumentLoader, localContextUrls } from './documentLoader';

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

	const keyPair = await Ed25519VerificationKey.from(keyData);
	const suite = new Ed25519Signature2020({
		signer: keyPair.signer(),
		date: new Date().toISOString()
	});

	// `issue()` mutates the credential in place, so sign a deep copy.
	const credentialCopy = structuredClone(credentialTemplate);

	// The interop Ed25519Signature2020 suite skips injecting its own context when
	// the VC 2.0 context is already present, but the legacy `Ed25519Signature2020`
	// proof type only defines `created` (and other proof terms) in the
	// ed25519-2020 suite context. Add it explicitly so proof canonicalization
	// resolves those terms and the signed `@context` matches OB3 output.
	const credentialContext = credentialCopy['@context'];
	if (
		Array.isArray(credentialContext) &&
		!credentialContext.includes(localContextUrls.ED25519_V1)
	) {
		credentialContext.push(localContextUrls.ED25519_V1);
	}

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
