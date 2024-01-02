import type { Organization } from '@prisma/client';
import { OB3_CONTEXT_URL, type OB3Image } from './constants';

export interface OB3Profile {
	'@context'?: string | string[];
	id: string;
	type: string[];
	name: string;
	url?: string;
	description?: string;
	email?: string;
	image?: OB3Image;
}

export const ob3IssuerProfileFromOrganization = (
	organization: Organization,
	includeContext: false
): OB3Profile => {
	return {
		...(includeContext ? { '@context': OB3_CONTEXT_URL } : null),
		type: ['Profile'],
		id: `did:web:${organization.domain}`,
		name: organization.name,
		...(organization.url ? { url: organization.url } : null),
		...(organization.description ? { description: organization.description } : null),
		...(organization.email ? { email: organization.email } : null),
		...(organization.logo
			? { image: { type: 'Image', id: organization.logo, caption: `${organization.name} logo` } }
			: null)
	};
};
