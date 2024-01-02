import { expect, test } from 'vitest';

import { testAchievement, testAchievementClaim, testOrganization } from '../../testObjects';
import { linkedInShareUrl } from '$lib/utils/shareCredentials';

test('linkedInShareUrl no expiration', () => {
	const achievementClaim = {
		...testAchievementClaim,
		achievement: {
			...testAchievement,
			organization: testOrganization
		}
	};

	const shareUrl = linkedInShareUrl(achievementClaim);

	expect(shareUrl.toString()).toEqual(
		'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=Test+Achievement&certId=urn%3Auuid%3Atest-achievement-claim-id&certUrl=https%3A%2F%2Fexample.com%2Fob2%2Fa%2Ftest-achievement-claim-id&organizationName=Test+Org&issueYear=2023&issueMonth=5'
	);
});

test('linkedInShareUrl with expiration', () => {
	const achievementClaim = {
		...testAchievementClaim,
		validUntil: new Date('2023-06-30'),
		achievement: {
			...testAchievement,
			organization: testOrganization
		}
	};

	const shareUrl = linkedInShareUrl(achievementClaim);

	expect(shareUrl.toString()).toEqual(
		'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=Test+Achievement&certId=urn%3Auuid%3Atest-achievement-claim-id&certUrl=https%3A%2F%2Fexample.com%2Fob2%2Fa%2Ftest-achievement-claim-id&organizationName=Test+Org&issueYear=2023&issueMonth=5&expirationYear=2023&expirationMonth=6'
	);
});
