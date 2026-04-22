import { describe, expect, it } from 'vitest';

import { isExchangeAvailable, isExchangeEnabled } from './config';

function org(json: App.OrganizationConfig | string | null, id = 'org-fixture'): App.Organization {
	return {
		id,
		name: 'Test',
		json: json as App.Organization['json']
	} as App.Organization;
}

const validTs = {
	url: 'https://ts.example.com',
	tenantName: 'tenant-1',
	encryptedApiKey: 'v1:abc',
	apiKeyUpdatedAt: '2024-01-01T00:00:00.000Z'
} satisfies App.TransactionServiceOrgConfig;

describe('isExchangeAvailable', () => {
	it('returns true when url, tenantName, and encryptedApiKey are non-empty strings', () => {
		expect(
			isExchangeAvailable(
				org({
					transactionService: validTs
				})
			)
		).toBe(true);
	});

	it('returns false when url is missing', () => {
		expect(
			isExchangeAvailable(
				org({
					transactionService: { ...validTs, url: '' }
				})
			)
		).toBe(false);
	});

	it('returns false when tenantName is missing or empty', () => {
		expect(
			isExchangeAvailable(
				org({
					transactionService: { ...validTs, tenantName: '' }
				})
			)
		).toBe(false);
	});

	it('returns false when encryptedApiKey is missing or empty', () => {
		expect(
			isExchangeAvailable(
				org({
					transactionService: { ...validTs, encryptedApiKey: '' }
				})
			)
		).toBe(false);
	});

	it("returns false when org.json is the string '{}'", () => {
		expect(isExchangeAvailable(org('{}' as unknown as App.OrganizationConfig))).toBe(false);
	});

	it('returns false when org.json is null', () => {
		const bad = { id: 'org-null-json', name: 'n', json: null } as unknown as App.Organization;
		expect(isExchangeAvailable(bad)).toBe(false);
	});
});

describe('isExchangeEnabled', () => {
	it("returns true when available and issuer.type is 'transactionService'", () => {
		expect(
			isExchangeEnabled(
				org({
					issuer: { type: 'transactionService' },
					transactionService: validTs
				})
			)
		).toBe(true);
	});

	it("returns false when available but issuer.type is 'signingKey'", () => {
		expect(
			isExchangeEnabled(
				org({
					issuer: { type: 'signingKey', signingKeyId: 'sk-1' },
					transactionService: validTs
				})
			)
		).toBe(false);
	});

	it('returns false when available but issuer is undefined', () => {
		expect(
			isExchangeEnabled(
				org({
					transactionService: validTs
				})
			)
		).toBe(false);
	});

	it("returns false when issuer is 'transactionService' but exchange is not available", () => {
		expect(
			isExchangeEnabled(
				org({
					issuer: { type: 'transactionService' },
					transactionService: { ...validTs, encryptedApiKey: '' }
				})
			)
		).toBe(false);
	});
});
