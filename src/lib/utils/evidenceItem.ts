import type { ClaimEndorsement, AchievementClaim } from '@prisma/client';

const parseEvidenceJson = (json: unknown): Record<string, unknown> => {
	if (!json) return {};
	if (typeof json === 'string') {
		try {
			return JSON.parse(json) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	if (typeof json === 'object') {
		return json as Record<string, unknown>;
	}
	return {};
};

export const evidenceItem = (e: ClaimEndorsement | AchievementClaim): App.EvidenceItem => {
	const jsonData = parseEvidenceJson(e.json);
	return Object.fromEntries(
		[
			['narrative', jsonData.narrative],
			['id', jsonData.id]
		].filter((i) => !!i[1])
	);
};
