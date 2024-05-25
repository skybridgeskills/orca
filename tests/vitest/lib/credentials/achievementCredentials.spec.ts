import { expect, test, vi } from 'vitest';

import { prisma } from '../../../../src/prisma/client';

import {
	testAchievement,
	testAchievementClaim,
	testOrganization,
	testSigningKey,
	testUser,
	testUserIdentifier
} from '../../testObjects';
import { achievementClaimToCredential } from '$lib/credentials/achievementCredential';
import { CredentialSubjectDID } from '$lib/credentials/did';

vi.mock('../../../../src/prisma/client');

test('achievement claim to credential', async () => {
	const date = new Date(2023, 4, 29);

	vi.useFakeTimers();
	vi.setSystemTime(date);

	vi.mocked(prisma.signingKey).findFirstOrThrow.mockResolvedValue(testSigningKey);

	const achievementClaimForTest = {
		...testAchievementClaim,
		achievement: testAchievement,
		user: {
			...testUser,
			identifiers: [testUserIdentifier]
		}
	};

	const credentialResult = await achievementClaimToCredential(
		achievementClaimForTest,
		testOrganization
	);

	expect(credentialResult).toBeDefined();
	expect(credentialResult.id).toEqual(`urn:uuid:${achievementClaimForTest.id}`);
	expect(credentialResult.credentialSubject.achievement.name).toEqual(
		achievementClaimForTest.achievement.name
	);
	expect(credentialResult.type).toEqual(['VerifiableCredential', 'OpenBadgeCredential']);
	expect(credentialResult.proof).toBeDefined();
	expect(credentialResult.proof?.type).toEqual('Ed25519Signature2020');
	expect(credentialResult.proof?.created).toEqual(date.toISOString());
	expect(credentialResult.proof?.verificationMethod).toEqual(
		`did:web:${testOrganization.domain}#key-0`
	); // TODO: the domain doesn't have the port colon specifier percent encoded
	expect(credentialResult.proof?.proofValue).toBeDefined();
	expect(credentialResult.proof?.proofPurpose).toEqual('assertionMethod');
	expect(credentialResult.issuer).toBeDefined();
	expect(credentialResult.issuer.id).toEqual(
		`did:web:${testOrganization.domain.replace(':', '%3A')}`
	);
	expect(credentialResult.issuer.type).toEqual('Profile');
	expect(credentialResult.issuer.name).toEqual(testOrganization.name);
	expect(credentialResult.issuer.email).toEqual(testOrganization.email);
	expect(credentialResult.issuer.description).toEqual(testOrganization.description);
	expect(credentialResult['@context']).toEqual([
		'https://www.w3.org/2018/credentials/v1',
		'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
		'https://w3id.org/security/suites/ed25519-2020/v1'
	]);
	expect(credentialResult.issuanceDate).toEqual(testAchievementClaim.validFrom?.toISOString());
	expect(credentialResult.credentialSubject).toBeDefined();
	expect(credentialResult.credentialSubject.id).toEqual(
		new CredentialSubjectDID(testOrganization, testUser).didString()
	);
	expect(credentialResult.credentialSubject.type).toEqual('AchievementSubject');
	expect(credentialResult.credentialSubject.achievement).toBeDefined();
	expect(credentialResult.credentialSubject.achievement.id).toEqual(
		`https://${testOrganization.domain}/achievements/${testAchievement.id}`
	);
	expect(credentialResult.credentialSubject.achievement.type).toEqual('Achievement');
	expect(credentialResult.credentialSubject.achievement.name).toEqual(testAchievement.name);
	expect(credentialResult.credentialSubject.achievement.description).toEqual(
		testAchievement.description
	);
	expect(credentialResult.credentialSubject.achievement.criteria).toEqual({
		narrative: testAchievement.criteriaNarrative
	}); //TODO: test an achievement with a criteriaId
	expect(credentialResult.credentialSubject.identifier).toBeDefined();
	expect(credentialResult.credentialSubject.identifier?.length).toEqual(1);
	expect(credentialResult.credentialSubject.identifier?.[0].salt).toBeDefined();
	expect(credentialResult.credentialSubject.identifier?.[0].type).toEqual('IdentityObject');
	expect(credentialResult.credentialSubject.identifier?.[0].hashed).toBe(true);
	expect(credentialResult.credentialSubject.identifier?.[0].identityHash).toBeDefined();
	expect(credentialResult.credentialSubject.identifier?.[0].identityType).toEqual('emailAddress');
});
