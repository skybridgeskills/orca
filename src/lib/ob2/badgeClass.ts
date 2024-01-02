import type { Achievement, Organization } from '@prisma/client';
import { OB2_CONTEXT_URL, OB_VERSION_DESCRIPTORS, type OB_VERSION } from './constants';
import { issuerFromOrganization, type OB2Issuer } from './issuer';
import { staticImageUrlForAchievement } from '$lib/utils/imageUrl';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

const OPEN_BADGES_ACHEIVEMENT_DEFINITION =
	'https://purl.imsglobal.org/spec/vc/ob/vocab.html#Achievement';

interface OB2Criteria {
	type: 'Criteria';
	id?: string;
	narrative?: string;
}

export interface OB2BadgeClass {
	'@context'?: typeof OB2_CONTEXT_URL;
	type: 'BadgeClass';
	id: string;
	name: string;
	description: string;
	image: string;
	criteria: OB2Criteria;
	issuer: string | OB2Issuer;
	related: Array<{ type: Array<string>; id: string; version: OB_VERSION }>;
}

export const badgeClassFromAchievement = (
	achievement: Achievement & { organization: Organization },
	embedContext = true
): OB2BadgeClass => {
	const baseDomain = `${PUBLIC_HTTP_PROTOCOL}://${achievement.organization.domain}`;
	return {
		...(embedContext ? { '@context': OB2_CONTEXT_URL } : null),
		type: 'BadgeClass',
		id: `${baseDomain}/ob2/b/${achievement.id}`,
		name: achievement.name,
		description: achievement.description,
		image: staticImageUrlForAchievement(achievement),
		criteria: {
			type: 'Criteria',
			// We know there will be at least one of `id`, `narrative`, because Achievement can't be saved without.
			...(achievement.criteriaId ? { id: achievement.criteriaId } : null),
			...(achievement.criteriaNarrative ? { narrative: achievement.criteriaNarrative } : null)
		},
		issuer: issuerFromOrganization(achievement.organization, false),
		related: [
			{
				type: [OPEN_BADGES_ACHEIVEMENT_DEFINITION],
				id: `${baseDomain}/a/${achievement.id}`,
				version: OB_VERSION_DESCRIPTORS.v3p0
			}
		]
	};
};
