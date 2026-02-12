import type { Achievement, AchievementClaim, Identifier, Organization, User } from '@prisma/client';
import { badgeClassFromAchievement, type OB2BadgeClass } from './badgeClass';
import { OB2_CONTEXT_URL, OB_VERSION_DESCRIPTORS, type OB_VERSION } from './constants';
import { OB3_NAMESPACE } from '../ob3/constants';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
import { arrayOf } from '$lib/utils/arrayOf';
import { randomBytes, createHash } from 'crypto';

export interface OB2BadgeAssertion {
	'@context': string;
	type: 'Assertion';
	id: string;
	recipient: {
		type: string;
		identity: string;
		hashed: boolean;
		salt?: string;
	};
	evidence: App.Evidence[];
	issuedOn: string;
	image?: string; // We don't need to include image, because it is already included in the badgeClass and we don't bother to bake.
	revoked?: boolean;
	revocationReason?: string;
	verification: { type: 'HostedBadge' };
	badge: string | OB2BadgeClass;
	related: Array<{ type: Array<string>; id: string; version: OB_VERSION }>;
}

export const evidenceFromAchievementClaim = (claim: AchievementClaim): App.Evidence[] => {
	if (!claim.json) return [];

	return arrayOf(claim.json);
};

export const badgeAssertionFromAchievementClaim = (
	claim: AchievementClaim & {
		achievement: Achievement & { organization: Organization };
		user: User & { identifiers: Identifier[] };
	}
): OB2BadgeAssertion | null => {
	if (!claim.validFrom || claim.validUntil) {
		return null;
	}
	const identifier = claim.user.identifiers.find(
		(identifier) => identifier.type === 'EMAIL'
	)?.identifier;
	if (!identifier) return null;

	// the salt is 20 random base64 characters
	const salt = randomBytes(20).toString('base64');
	const identityHash = `sha256$${createHash('sha256')
		.update(`${identifier}${salt}`)
		.digest('hex')}`;

	const baseDomain = `${PUBLIC_HTTP_PROTOCOL}://${claim.achievement.organization.domain}`;
	return {
		'@context': OB2_CONTEXT_URL,
		type: 'Assertion',
		id: `${baseDomain}/ob2/a/${claim.id}`,
		recipient: {
			type: 'email',
			identity: identityHash,
			hashed: true,
			salt: salt
		},
		issuedOn: claim.validFrom.toISOString(),
		badge: badgeClassFromAchievement(claim.achievement, false),
		evidence: evidenceFromAchievementClaim(claim),

		verification: {
			type: 'HostedBadge'
		},

		// TODO: only include related OB3 version if the user has enabled that for public access.
		//Usually there is not a need to make OB3 available via public endpoints; they are transmitted directly.
		related: [
			{
				type: [`${OB3_NAMESPACE}Achievement`],
				id: `${baseDomain}/a/${claim.achievement.id}`, // TODO check for consistency
				version: OB_VERSION_DESCRIPTORS.v3p0
				// TODO: add digestMultibase to express a link to a specific content-id / file integrity checksum?
			}
		]
	};
};
