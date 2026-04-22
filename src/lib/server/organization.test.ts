import { describe, expect, it } from 'vitest';
import { sanitizeOrganizationForClient } from './organization';

function minimalOrg(opts?: {
	id?: string;
	name?: string;
	json?: App.OrganizationConfig;
}): App.Organization {
	const json = opts?.json ?? {};
	return {
		id: opts?.id ?? 'org-test',
		name: opts?.name ?? 'Test Org',
		json
	} as App.Organization;
}

describe('sanitizeOrganizationForClient', () => {
	it('returns a deep-equal clone when json has no transactionService; does not mutate input', () => {
		const org = minimalOrg({
			json: {
				tagline: 'Hello',
				permissions: {
					editAchievementCapability: { requiresAchievement: 'ach-1' }
				}
			}
		});
		const before = structuredClone(org);

		const result = sanitizeOrganizationForClient(org);

		expect(result).toEqual(org);
		expect(result).not.toBe(org);
		expect(result.json).not.toBe(org.json);
		expect(org).toEqual(before);
	});

	it('strips encryptedApiKey, sets apiKeyConfigured true, preserves other transactionService fields; does not mutate input', () => {
		const org = minimalOrg({
			json: {
				tagline: 'T',
				transactionService: {
					url: 'https://ts.example',
					tenantName: 'tenant-a',
					encryptedApiKey: 'v1:abc',
					apiKeyUpdatedAt: '2026-04-21T00:00:00.000Z'
				}
			}
		});
		const before = structuredClone(org);

		const result = sanitizeOrganizationForClient(org);

		expect(result.json.transactionService).toEqual({
			url: 'https://ts.example',
			tenantName: 'tenant-a',
			apiKeyUpdatedAt: '2026-04-21T00:00:00.000Z',
			apiKeyConfigured: true
		});
		expect('encryptedApiKey' in (result.json.transactionService ?? {})).toBe(false);
		expect(org).toEqual(before);
	});

	it('sets apiKeyConfigured false when encryptedApiKey is missing or empty', () => {
		const missingKey = minimalOrg({
			json: {
				transactionService: {
					url: 'https://ts.example',
					tenantName: 'tenant-b',
					apiKeyUpdatedAt: '2026-04-21T00:00:00.000Z'
				} as App.TransactionServiceOrgConfig
			}
		});
		const beforeMissing = structuredClone(missingKey);
		const outMissing = sanitizeOrganizationForClient(missingKey);
		expect(outMissing.json.transactionService?.apiKeyConfigured).toBe(false);
		expect('encryptedApiKey' in (outMissing.json.transactionService ?? {})).toBe(false);
		expect(missingKey).toEqual(beforeMissing);

		const emptyKey = minimalOrg({
			json: {
				transactionService: {
					url: 'https://ts.example',
					tenantName: 'tenant-c',
					encryptedApiKey: '',
					apiKeyUpdatedAt: '2026-04-21T12:00:00.000Z'
				}
			}
		});
		const beforeEmpty = structuredClone(emptyKey);
		const outEmpty = sanitizeOrganizationForClient(emptyKey);
		expect(outEmpty.json.transactionService?.apiKeyConfigured).toBe(false);
		expect('encryptedApiKey' in (outEmpty.json.transactionService ?? {})).toBe(false);
		expect(emptyKey).toEqual(beforeEmpty);
	});
});
