import { expect, test } from 'vitest';

import {
	testAchievement,
	testAchievementClaim,
	testOrganization,
	testUser,
	testUserIdentifier
} from '../../testObjects';
import { OrganizationDID } from '$lib/credentials/did';
import { issuerFromOrganization, type OB2Issuer } from '$lib/ob2/issuer';
import { badgeClassFromAchievement, type OB2BadgeClass } from '$lib/ob2/badgeClass';
import { badgeAssertionFromAchievementClaim } from '$lib/ob2/badgeAssertion';

test('issuerFromOrganization', () => {
	const ob2Issuer = issuerFromOrganization(testOrganization);

	const expectedResult: OB2Issuer = {
		'@context': 'https://w3id.org/openbadges/v2',
		id: 'http://example.com/ob2/i',
		type: 'Issuer',
		name: testOrganization.name,
		url: testOrganization.url!,
		email: testOrganization.email,
		description: testOrganization.description,
		related: [
			{
				type: ['https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile'],
				id: 'http://example.com/.well-known/did.json',
				'schema:sameAs': new OrganizationDID(testOrganization).didString(),
				version: 'Open Badges v3p0'
			}
		]
	};

	expect(ob2Issuer).toEqual(expectedResult);
});

test('badgeClassFromAchievement', () => {
	const testAchievementWithOrganization = {
		...testAchievement,
		organization: testOrganization
	};
	const ob2BadgeClass = badgeClassFromAchievement(testAchievementWithOrganization);

	const expectedResult: OB2BadgeClass = {
		'@context': 'https://w3id.org/openbadges/v2',
		id: `http://${testAchievementWithOrganization.organization.domain}/ob2/b/${testAchievement.id}`,
		type: 'BadgeClass',
		name: testAchievement.name,
		description: testAchievement.description,
		criteria: {
			type: 'Criteria',
			narrative: testAchievement.criteriaNarrative!
		}, //TODO: test with criteriaUrl
		image: `http://${testAchievementWithOrganization.organization.domain}/achievements/${testAchievement.id}/image`,
		issuer: {
			id: 'http://example.com/ob2/i',
			type: 'Issuer',
			name: testOrganization.name,
			url: testOrganization.url!,
			email: testOrganization.email,
			description: testOrganization.description,
			related: [
				{
					type: ['https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile'],
					id: 'http://example.com/.well-known/did.json',
					'schema:sameAs': new OrganizationDID(testOrganization).didString(),
					version: 'Open Badges v3p0'
				}
			]
		},
		related: [
			{
				type: ['https://purl.imsglobal.org/spec/vc/ob/vocab.html#Achievement'],
				id: `http://${testAchievementWithOrganization.organization.domain}/a/${testAchievement.id}`,
				version: 'Open Badges v3p0'
			}
		]
	};

	expect(ob2BadgeClass).toEqual(expectedResult);
});

test('badgeAssertionFromAchievementClaim', () => {
	const testAchievementClaimWithAchievementWithOrganization = {
		...testAchievementClaim,
		achievement: {
			...testAchievement,
			organization: testOrganization
		},
		user: {
			...testUser,
			identifiers: [testUserIdentifier]
		}
	};
	const ob2BadgeAssertion = badgeAssertionFromAchievementClaim(
		testAchievementClaimWithAchievementWithOrganization
	);
	expect(ob2BadgeAssertion).toEqual({
		'@context': 'https://w3id.org/openbadges/v2',
		id: `http://${testAchievementClaimWithAchievementWithOrganization.achievement.organization.domain}/ob2/a/${testAchievementClaimWithAchievementWithOrganization.id}`,
		type: 'Assertion',
		badge: {
			criteria: {
				narrative: 'Some long form achievement criteria.',
				type: 'Criteria'
			},
			description: 'Achievement for Unit Test',
			id: 'http://example.com/ob2/b/test-achievement-id',
			image: `http://${testAchievementClaimWithAchievementWithOrganization.achievement.organization.domain}/achievements/${testAchievementClaimWithAchievementWithOrganization.achievement.id}/image`,
			name: 'Test Achievement',
			related: [
				{
					id: 'http://example.com/a/test-achievement-id',
					type: ['https://purl.imsglobal.org/spec/vc/ob/vocab.html#Achievement'],
					version: 'Open Badges v3p0'
				}
			],
			type: 'BadgeClass',
			issuer: {
				description: 'A unit test organization',
				email: 'admin@example.com',
				id: 'http://example.com/ob2/i',
				name: 'Test Org',
				related: [
					{
						id: 'http://example.com/.well-known/did.json',
						'schema:sameAs': 'did:web:example.com',
						type: ['https://purl.imsglobal.org/spec/vc/ob/vocab.html#Profile'],
						version: 'Open Badges v3p0'
					}
				],
				type: 'Issuer',
				url: 'https://cooltestorg.example.com'
			}
		},
		recipient: {
			hashed: true,
			identity: expect.any(String),
			salt: expect.any(String),
			type: 'email'
		},
		issuedOn: testAchievementClaim.validFrom?.toISOString(),
		verification: {
			type: 'HostedBadge'
		},
		related: [
			{
				id: 'http://example.com/a/test-achievement-id',
				type: ['https://purl.imsglobal.org/spec/vc/ob/vocab.html#Achievement'],
				version: 'Open Badges v3p0'
			}
		],
		evidence: []
	});
});
