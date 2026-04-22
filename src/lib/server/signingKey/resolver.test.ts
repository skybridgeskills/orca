import { beforeEach, describe, expect, it, vi } from 'vitest';

import { testOrganization, testSigningKey } from '../../../../tests/vitest/testObjects';
import { prisma } from '../../../prisma/client';
import { IssuerMisconfiguredError, resolveActiveSigningKey } from './resolver';

const { findFirst, findFirstOrThrow } = vi.hoisted(() => ({
	findFirst: vi.fn(),
	findFirstOrThrow: vi.fn()
}));

vi.mock('../../../prisma/client', () => ({
	prisma: {
		signingKey: {
			findFirst,
			findFirstOrThrow
		}
	}
}));

function orgWithJson(json: App.OrganizationConfig | string | null): App.Organization {
	return {
		...testOrganization,
		json: json as App.Organization['json']
	} as App.Organization;
}

describe('resolveActiveSigningKey', () => {
	beforeEach(() => {
		findFirst.mockReset();
		findFirstOrThrow.mockReset();
	});

	it('returns selected key when findFirst matches', async () => {
		const org = orgWithJson({
			issuer: { type: 'signingKey', signingKeyId: 'k-1' }
		});
		findFirst.mockResolvedValue(testSigningKey);

		const result = await resolveActiveSigningKey(org);

		expect(result).toBe(testSigningKey);
		expect(findFirst).toHaveBeenCalledWith({
			where: {
				id: 'k-1',
				organizationId: org.id,
				revoked: false
			}
		});
		expect(findFirstOrThrow).not.toHaveBeenCalled();
	});

	it('throws IssuerMisconfiguredError when selected key is missing or revoked', async () => {
		const org = orgWithJson({
			issuer: { type: 'signingKey', signingKeyId: 'k-missing' }
		});
		findFirst.mockResolvedValue(null);

		await expect(resolveActiveSigningKey(org)).rejects.toThrow(IssuerMisconfiguredError);
		await expect(resolveActiveSigningKey(org)).rejects.toThrow(/k-missing/);
	});

	it('uses deterministic fallback when no issuer selection (object json)', async () => {
		const org = orgWithJson({});
		findFirstOrThrow.mockResolvedValue(testSigningKey);

		const result = await resolveActiveSigningKey(org);

		expect(result).toBe(testSigningKey);
		expect(findFirst).not.toHaveBeenCalled();
		expect(findFirstOrThrow).toHaveBeenCalledWith({
			where: {
				organizationId: org.id,
				revoked: false
			},
			orderBy: { id: 'asc' }
		});
	});

	it('uses fallback when org.json is a non-object (string)', async () => {
		const org = orgWithJson('{}');
		findFirstOrThrow.mockResolvedValue(testSigningKey);

		await resolveActiveSigningKey(org);

		expect(findFirstOrThrow).toHaveBeenCalledWith({
			where: {
				organizationId: org.id,
				revoked: false
			},
			orderBy: { id: 'asc' }
		});
	});

	it('propagates Prisma errors from findFirstOrThrow when no keys exist', async () => {
		const org = orgWithJson({});
		const boom = new Error('P2025: Record not found');
		findFirstOrThrow.mockRejectedValue(boom);

		await expect(resolveActiveSigningKey(org)).rejects.toBe(boom);
	});
});
