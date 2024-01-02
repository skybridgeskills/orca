import type { Organization } from '@prisma/client';
import { OrganizationDID } from '$lib/credentials/did';
import { OB2_CONTEXT_URL, OB_VERSION_DESCRIPTORS, type OB_VERSION } from '$lib/ob2/constants';
import { OB3_NAMESPACE } from '$lib/ob3/constants';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
import {} from './constants';

export interface OB2Issuer {
	'@context'?: typeof OB2_CONTEXT_URL;
	name: string;
	type: 'Profile' | 'Issuer';
	id: string;
	url: string | null;
	email: string;
	description: string;
	related: Array<{
		type: Array<string>;
		id: string;
		'schema:sameAs': string;
		version: OB_VERSION;
	}>;
}

export const issuerFromOrganization = (
	organization: Organization,
	embedContext = true
): OB2Issuer => {
	const did = new OrganizationDID(organization);
	const baseDomain = `${PUBLIC_HTTP_PROTOCOL}://${organization.domain}`;
	const issuer: OB2Issuer = {
		...(embedContext ? { '@context': OB2_CONTEXT_URL } : null),
		name: organization.name,
		type: 'Issuer',
		id: `${baseDomain}/ob2/i`,
		email: organization.email,
		url: organization.url,
		description: organization.description,
		related: [
			{
				type: [`${OB3_NAMESPACE}Profile`],
				id: `${baseDomain}/.well-known/did.json`, // Existing validator can't handle `did:` prefix yet.
				'schema:sameAs': did.didString(),
				version: OB_VERSION_DESCRIPTORS.v3p0
			}
		]
	};

	if (organization.url) issuer.url = organization.url;

	return issuer;
};
