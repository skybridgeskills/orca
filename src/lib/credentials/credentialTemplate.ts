import { createHash } from 'crypto';

import type { Achievement, AchievementClaim, Identifier, Organization, User } from '@prisma/client';
import { IdentifierType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { CredentialSubjectDID, OrganizationDID } from '$lib/credentials/did';
import { alignmentRowsFromAchievementJson } from '$lib/data/alignment';

export interface CredentialTemplateOptions {
	/** Omit `credentialSubject.id` (the transaction service inserts the holder DID itself). */
	includeSubjectId?: boolean;
	/** Subject DID override, e.g. a wallet's DID-authenticated holder DID. Defaults to the
	 * org-generated did:web for the user. */
	subjectId?: string;
	/** Credential `id` override. Defaults to `urn:uuid:<claim id>` (the claim's cached credential). */
	credentialId?: string;
}

/**
 * Builds an unsigned Open Badge credential payload. No `proof` field is set; signing adds it.
 */
export function buildAchievementCredentialTemplate(
	claim: AchievementClaim & {
		achievement: Achievement;
		user: User & { identifiers: Identifier[] };
	},
	organization: Organization,
	options: CredentialTemplateOptions = {}
): App.OpenBadgeCredential {
	const { includeSubjectId = true } = options;
	const subjectId =
		options.subjectId ?? new CredentialSubjectDID(organization, claim.user).didString();
	const organizationDid = new OrganizationDID(organization);

	// OB2/OB3 Alignment uses `targetUrl`; internal storage maps `targetUrl` (see legacy readers in alignment.ts).
	const storedAlignments = alignmentRowsFromAchievementJson(claim.achievement.json);
	const credentialAlignments = storedAlignments.map((alignment) => ({
		type: 'Alignment' as const,
		targetUrl: alignment.targetUrl,
		targetName: alignment.targetName,
		...(alignment.targetDescription ? { targetDescription: alignment.targetDescription } : {}),
		...(alignment.targetCode ? { targetCode: alignment.targetCode } : {})
	}));

	const achievementSubject = {
		type: 'AchievementSubject' as const,
		achievement: {
			id: `https://${organization.domain}/achievements/${claim.achievement.id}`,
			type: 'Achievement' as const,
			criteria: {
				narrative: claim.achievement.criteriaNarrative || ''
			},
			description: claim.achievement.description,
			name: claim.achievement.name,
			...(credentialAlignments.length > 0 ? { alignment: credentialAlignments } : {})
		}
	};

	const credentialSubject = includeSubjectId
		? {
				id: subjectId,
				...achievementSubject
			}
		: { ...achievementSubject };

	const credentialTemplate = {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		id: options.credentialId ?? `urn:uuid:${claim.id}`,
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: {
			id: organizationDid.didString(),
			type: 'Profile',
			name: organization.name,
			email: organization.email,
			description: organization.description
		},
		validFrom: claim.validFrom?.toISOString() ?? new Date().toISOString(),
		credentialSubject
	} as App.OpenBadgeCredential;

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

	return credentialTemplate;
}
