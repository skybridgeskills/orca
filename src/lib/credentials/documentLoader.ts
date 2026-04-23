import jsigs from 'jsonld-signatures';

import { CONTEXT as CREDENTIALS_V1 } from './contexts/credentials_v1p1';
import { CONTEXT as CREDENTIALS_V2 } from './contexts/credentials_v2';
import { CONTEXT as OPEN_BADGES_V3_0 } from './contexts/openbadges-v3p0';
import { CONTEXT as OPEN_BADGES_V3_0_3 } from './contexts/openbadges-v3p0p3';
import { CONTEXT as ED25519_V1 } from './contexts/ed25519-signature-2020-v1';

export const localContextUrls = {
	CREDENTIALS_V1: 'https://www.w3.org/2018/credentials/v1',
	CREDENTIALS_V2: 'https://www.w3.org/ns/credentials/v2',
	OPEN_BADGES_V3_0: 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
	OPEN_BADGES_V3_0_3: 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
	ED25519_V1: 'https://w3id.org/security/suites/ed25519-2020/v1'
};

export const localContexts = new Map([
	[localContextUrls.CREDENTIALS_V1, JSON.parse(CREDENTIALS_V1)],
	[localContextUrls.CREDENTIALS_V2, JSON.parse(CREDENTIALS_V2)],
	[localContextUrls.OPEN_BADGES_V3_0, JSON.parse(OPEN_BADGES_V3_0)],
	[localContextUrls.OPEN_BADGES_V3_0_3, JSON.parse(OPEN_BADGES_V3_0_3)],
	[localContextUrls.ED25519_V1, JSON.parse(ED25519_V1)]
]);

export const extendedDocumentLoader = async (url: string) => {
	const context = localContexts.get(url);
	if (context !== undefined) {
		return {
			contextUrl: null,
			documentUrl: url,
			document: context,
			tag: 'static'
		};
	}

	const loader = jsigs.strictDocumentLoader as (url: string) => Promise<any>;
	return await loader(url);
};
