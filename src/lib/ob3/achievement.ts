import type { Achievement, Organization } from '@prisma/client';
import { alignmentRowsFromAchievementJson } from '$lib/data/alignment';
import { staticImageUrlForAchievement } from '$lib/utils/imageUrl';
import { OB2_NAMESPACE, OB_VERSION_DESCRIPTORS } from '../ob2/constants';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
import { ob3IssuerProfileFromOrganization, type OB3Profile } from './profile';
import { OB3_CONTEXT_URL, type OB3Image } from './constants';

interface RelatedItem {
	type: string[];
	id: string;
	version?: string;
}

interface OB3Alignment {
	type: 'Alignment';
	targetUrl: string;
	targetName: string;
	targetDescription?: string;
	targetCode?: string;
}

// A basic Achievement interface supporting properties that ORCA uses to date
interface OB3Achievement {
	'@context'?: string | string[];
	type: string | string[];
	id: string;
	name: string;
	description: string;
	image?: OB3Image;
	criteria: {
		id?: string;
		narrative?: string;
	};
	creator?: OB3Profile;
	related?: RelatedItem[];
	alignment?: OB3Alignment[];
}

export const ob3AchievementFromAchievement = (
	achievement: Achievement & { organization: Organization },
	includeContext = false
): OB3Achievement => {
	const baseDomain = `${PUBLIC_HTTP_PROTOCOL}://${achievement.organization.domain}`;
	const storedAlignments = alignmentRowsFromAchievementJson(achievement.json);
	const ob3Alignments: OB3Alignment[] = storedAlignments.map((alignment) => ({
		type: 'Alignment',
		targetUrl: alignment.targetUrl,
		targetName: alignment.targetName,
		...(alignment.targetDescription ? { targetDescription: alignment.targetDescription } : {}),
		...(alignment.targetCode ? { targetCode: alignment.targetCode } : {})
	}));

	return {
		...(includeContext ? { '@context': OB3_CONTEXT_URL } : null),
		type: 'Achievement',
		id: `${baseDomain}/a/${achievement.id}`,
		name: achievement.name,
		description: achievement.description,
		image: {
			type: 'Image',
			id: staticImageUrlForAchievement(achievement)
			// TODO: caption: "..."
		},
		criteria: {
			...(achievement.criteriaId ? { id: achievement.criteriaId } : null),
			...(achievement.criteriaNarrative ? { narrative: achievement.criteriaNarrative } : null)
		},
		creator: ob3IssuerProfileFromOrganization(achievement.organization, false),
		related: [
			{
				type: ['Related', `${OB2_NAMESPACE}BadgeClass`],
				id: `${baseDomain}/ob2/b/${achievement.id}`,
				version: OB_VERSION_DESCRIPTORS.v2p0
			}
		],
		...(ob3Alignments.length > 0 ? { alignment: ob3Alignments } : {})
	};
};
