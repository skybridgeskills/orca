import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Achievement, AchievementClaim, Identifier, Organization, User } from '@prisma/client';
import { IdentifierType } from '@prisma/client';
import { CredentialSubjectDID, OrganizationDID } from '$lib/credentials/did';

/**
 * Builds an unsigned Open Badge credential payload. No `proof` field is set; signing adds it.
 */
export function buildAchievementCredentialTemplate(
	claim: AchievementClaim & {
		achievement: Achievement;
		user: User & { identifiers: Identifier[] };
	},
	organization: Organization,
	options: { includeSubjectId?: boolean } = {}
): App.OpenBadgeCredential {
	const { includeSubjectId = true } = options;
	const generatedSubjectDid = new CredentialSubjectDID(organization, claim.user);
	const organizationDid = new OrganizationDID(organization);

	const achievementSubject = {
		type: 'AchievementSubject' as const,
		achievement: {
			id: `https://${organization.domain}/achievements/${claim.achievement.id}`,
			type: 'Achievement' as const,
			criteria: {
				narrative: claim.achievement.criteriaNarrative || ''
			},
			description: claim.achievement.description,
			name: claim.achievement.name
		}
	};

	const credentialSubject = includeSubjectId
		? {
				id: generatedSubjectDid.didString(),
				...achievementSubject
			}
		: { ...achievementSubject };

	const credentialTemplate = {
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
