import { describe, expect, it } from 'vitest';

import {
	testAchievement,
	testAchievementClaim,
	testOrganization,
	testUser,
	testUserIdentifier
} from '../../../tests/vitest/testObjects';
import { CredentialSubjectDID } from '$lib/credentials/did';
import { buildAchievementCredentialTemplate } from './credentialTemplate';

describe('buildAchievementCredentialTemplate', () => {
	const claim = {
		...testAchievementClaim,
		achievement: testAchievement,
		user: {
			...testUser,
			identifiers: [testUserIdentifier]
		}
	};

	it('default options: subject id, identifier, no proof', () => {
		const result = buildAchievementCredentialTemplate(claim, testOrganization);

		expect(result.proof).toBeUndefined();
		expect(result.credentialSubject.id).toEqual(
			new CredentialSubjectDID(testOrganization, testUser).didString()
		);
		expect(result.credentialSubject.identifier).toBeDefined();
		expect(result.credentialSubject.identifier?.length).toBe(1);
		expect(result.credentialSubject.identifier?.[0].type).toBe('IdentityObject');
	});

	it('includeSubjectId false omits credentialSubject.id', () => {
		const result = buildAchievementCredentialTemplate(claim, testOrganization, {
			includeSubjectId: false
		});

		expect('id' in result.credentialSubject).toBe(false);
		expect(result.credentialSubject.identifier).toBeDefined();
	});
});
