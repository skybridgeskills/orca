import type {
	Achievement,
	AchievementClaim,
	Identifier,
	Organization,
	SigningKey,
	User
} from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Build a minimal stand-in for SvelteKit's `RequestEvent` suitable for unit
 * tests that exercise hook/server helpers. The inner `as unknown as RequestEvent`
 * cast is intentional and local: the mock is deliberately partial.
 */
export function makeFakeRequestEvent(
	overrides: Partial<RequestEvent> & { host?: string } = {}
): RequestEvent<Record<string, string>, string | null> {
	const { host = 'example.com', ...rest } = overrides;
	return {
		url: new URL(`http://${host}`),
		...rest
	} as unknown as RequestEvent<Record<string, string>, string | null>;
}

export const testDate = new Date('2023-05-23');

export const testOrganization: Organization = {
	id: 'test-org-id',
	createdAt: testDate,
	name: 'Test Org',
	description: 'A unit test organization',
	domain: 'example.com',
	url: 'https://cooltestorg.example.com',
	email: 'admin@example.com',
	primaryColor: null,
	logo: null,
	json: '{}'
};

export const testUser: User = {
	id: 'test-user-id',
	givenName: 'Test',
	familyName: 'User',
	orgRole: null,
	organizationId: testOrganization.id,
	defaultVisibility: 'PRIVATE'
};

export const testUserIdentifier: Identifier = {
	id: 'test-user-identifier-id',
	type: 'EMAIL',
	identifier: 'testuser@example.com',
	verifiedAt: testDate,
	userId: testUser.id,
	organizationId: testOrganization.id,
	visibility: 'PRIVATE'
};

export const testAchievement: Achievement = {
	id: 'test-achievement-id',
	identifier: 'urn:uuid:test-achievement-uuid',
	organizationId: testOrganization.id,
	achievementStatus: 'ACTIVE',
	achievementType: null,
	name: 'Test Achievement',
	description: 'Achievement for Unit Test',
	criteriaId: null,
	criteriaNarrative: 'Some long form achievement criteria.',
	image: null,
	creatorProfileId: null,
	json: null,
	categoryId: null,
	claimable: false,
	claimRequiresId: null,
	reviewRequiresId: null
};

export const testAchievementClaim: AchievementClaim = {
	id: 'test-achievement-claim-id',
	organizationId: testAchievement.organizationId,
	createdOn: testDate,
	credentialId: null,
	achievementId: testAchievement.id,
	userId: 'test-user-id',
	creatorId: null,
	claimStatus: 'ACCEPTED',
	validFrom: testDate,
	validUntil: null,
	visibility: 'PRIVATE',
	json: null
};

export const testSigningKey: SigningKey = {
	id: 'test-signing-key-id',
	revoked: false,
	publicKeyMultibase: 'z6MkiyDV3sQxoycGRF3Bn5Bt9rXEqiZkPPWDhWuQpCsmGYmh',
	privateKeyMultibase:
		'zrv4yiXWQoCky18e653M8XnTR818dxwKaz54Xm1UuNRTJ6xSa8S3hAp8T53YScgSWypfqdfDmYvkfZo5HbFCmfqvMMu',
	organizationId: testOrganization.id
};
