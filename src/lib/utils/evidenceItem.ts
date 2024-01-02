import type { ClaimEndorsement, AchievementClaim } from '@prisma/client';

export const evidenceItem = (e: ClaimEndorsement | AchievementClaim): App.EvidenceItem => {
	const jsonData = JSON.parse(e.json?.toString() || '{}');
	return Object.fromEntries(
		[
			['narrative', jsonData.narrative],
			['id', jsonData.id]
		].filter((i) => !!i[1])
	);
};
