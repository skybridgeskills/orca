export const OB2_CONTEXT_URL = 'https://w3id.org/openbadges/v2';
export const OB2_NAMESPACE = 'https://w3id.org/openbadges#';

export const OB_VERSION_DESCRIPTORS = {
	v2p0: 'Open Badges v2p0', // Open Badges 2.0 Data Model
	v2p1: 'Open Badges v2p1', // Open Badges 2.1 Badge Connect API
	v3p0: 'Open Badges v3p0' // Open Badges 3.0 Data Model and API (VC 1.1-compatible, CLR 2.0-compatible)
};
export type OB_VERSION = (typeof OB_VERSION_DESCRIPTORS)[keyof typeof OB_VERSION_DESCRIPTORS];
