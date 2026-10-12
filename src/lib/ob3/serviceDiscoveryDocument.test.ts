import type { Organization } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SCOPES, serviceDiscoveryDocumentForOrg } from './serviceDiscoveryDocument';

vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

const SCOPE = 'https://purl.imsglobal.org/spec/ob/v3p0/scope/';

const org = {
	id: 'org-1',
	name: 'Example',
	domain: 'example.test',
	email: 'org@example.test',
	url: 'https://example.test',
	logo: null
} as unknown as Organization;

describe('OB3 service discovery document', () => {
	const doc = serviceDiscoveryDocumentForOrg(org);
	const json = JSON.stringify(doc);

	it('does not advertise upsertCredential or the credential.upsert scope', () => {
		expect(json).not.toContain('upsertCredential');
		expect(json).not.toContain(`${SCOPE}credential.upsert`);
		expect(Object.keys(DEFAULT_SCOPES)).not.toContain(`${SCOPE}credential.upsert`);
		expect(Object.keys(doc.paths['/credentials'])).toEqual(['get']);
	});

	it('still advertises getCredentials and the readonly scopes', () => {
		expect(doc.paths['/credentials'].get.operationId).toBe('getCredentials');
		const scopes = doc.components.securitySchemes.OAuth2ACG.flows.authorizationCode.scopes;
		expect(Object.keys(scopes)).toEqual(
			expect.arrayContaining([`${SCOPE}credential.readonly`, `${SCOPE}profile.readonly`])
		);
	});
});
