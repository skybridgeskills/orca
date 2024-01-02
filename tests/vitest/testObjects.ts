import type {
	Achievement,
	AchievementClaim,
	Identifier,
	Organization,
	SigningKey,
	User
} from '@prisma/client';
import { test } from 'vitest';

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
	logo: null
};

export const testUser: User = {
	id: 'test-user-id',
	givenName: 'Test',
	familyName: 'User',
	orgRole: null,
	organizationId: testOrganization.id
};

export const testUserIdentifier: Identifier = {
	id: 'test-user-identifier-id',
	type: 'EMAIL',
	identifier: 'testuser@example.com',
	verifiedAt: testDate,
	userId: testUser.id,
	organizationId: testOrganization.id
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
	categoryId: null
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
