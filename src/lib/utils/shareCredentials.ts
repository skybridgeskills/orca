import type { Achievement, AchievementClaim, Organization } from '@prisma/client';

const LINKED_IN_SHARE_URL = 'https://www.linkedin.com/profile/add';

export const linkedInShareUrl = (
	achievementClaim: AchievementClaim & { achievement: Achievement & { organization: Organization } }
): URL => {
	const { id: certId, achievement, validFrom, validUntil } = achievementClaim;
	const {
		name,
		organization: { name: organizationName, domain: organizationDomain }
	} = achievement;
	const certUrl = `https://${organizationDomain}/ob2/a/${certId}`;

	const queryParams = new URLSearchParams({
		startTask: 'CERTIFICATION_NAME',
		name,
		certId: `urn:uuid:${certId}`,
		certUrl,
		organizationName
	});

	if (validFrom) {
		queryParams.append('issueYear', validFrom.getUTCFullYear().toString());
		queryParams.append('issueMonth', (validFrom.getUTCMonth() + 1).toString());
	}

	if (validUntil) {
		queryParams.append('expirationYear', validUntil.getUTCFullYear().toString());
		queryParams.append('expirationMonth', (validUntil.getUTCMonth() + 1).toString());
	}

	return new URL(`${LINKED_IN_SHARE_URL}?${queryParams.toString()}`);
};
