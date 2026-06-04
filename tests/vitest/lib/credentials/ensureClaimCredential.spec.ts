import { beforeEach, describe, expect, test, vi } from 'vitest';

import { prisma } from '../../../../src/prisma/client';
import {
	testAchievement,
	testAchievementClaim,
	testOrganization,
	testUser,
	testUserIdentifier
} from '../../testObjects';
import type { AchievementCredential } from '@prisma/client';
import {
	ensureClaimCredential,
	TransactionServiceIssuerError
} from '$lib/credentials/ensureClaimCredential';
import { achievementClaimToCredential } from '$lib/credentials/achievementCredential';

vi.mock('../../../../src/prisma/client');
vi.mock('$lib/credentials/achievementCredential');

const baseClaim = {
	...testAchievementClaim,
	achievement: testAchievement,
	user: {
		...testUser,
		identifiers: [testUserIdentifier]
	}
};

const signedCredential = {
	id: 'urn:uuid:signed-credential-id',
	credentialSubject: { id: 'did:example:subject' }
} as unknown as App.OpenBadgeCredential;

const storedCredential = {
	id: 'stored-credential-id',
	identifier: 'urn:uuid:stored',
	subjectId: 'did:example:stored-subject',
	json: { proof: { created: new Date().toISOString() } }
} as unknown as AchievementCredential;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(achievementClaimToCredential).mockResolvedValue(signedCredential);
});

describe('ensureClaimCredential', () => {
	test('throws TransactionServiceIssuerError for wallet-exchange orgs', async () => {
		const org = {
			...testOrganization,
			json: { issuer: { type: 'transactionService' } }
		} as unknown as App.Organization;

		await expect(
			ensureClaimCredential({ ...baseClaim, credential: null }, org, {
				regenerateIfStale: true,
				creatorUserId: testUser.id
			})
		).rejects.toBeInstanceOf(TransactionServiceIssuerError);

		expect(achievementClaimToCredential).not.toHaveBeenCalled();
		expect(prisma.achievementCredential.create).not.toHaveBeenCalled();
	});

	test('returns existing credential without re-signing when regenerateIfStale is false', async () => {
		const org = testOrganization as unknown as App.Organization;

		const result = await ensureClaimCredential(
			{ ...baseClaim, credential: storedCredential },
			org,
			{
				regenerateIfStale: false,
				creatorUserId: testUser.id
			}
		);

		expect(result).toBe(storedCredential);
		expect(achievementClaimToCredential).not.toHaveBeenCalled();
		expect(prisma.achievementCredential.update).not.toHaveBeenCalled();
		expect(prisma.achievementCredential.create).not.toHaveBeenCalled();
	});

	test('mints and persists a new credential when none exists', async () => {
		const org = testOrganization as unknown as App.Organization;
		const created = { ...storedCredential, id: 'newly-created' } as AchievementCredential;
		vi.mocked(prisma.achievementCredential.create).mockResolvedValue(created);

		const result = await ensureClaimCredential({ ...baseClaim, credential: null }, org, {
			regenerateIfStale: true,
			creatorUserId: testUser.id
		});

		expect(achievementClaimToCredential).toHaveBeenCalledWith(
			{ ...baseClaim, credential: null },
			org
		);
		expect(prisma.achievementCredential.create).toHaveBeenCalledTimes(1);
		const createArg = vi.mocked(prisma.achievementCredential.create).mock.calls[0][0];
		expect(createArg.data.creatorUser).toEqual({ connect: { id: testUser.id } });
		expect(createArg.data.identifier).toEqual(signedCredential.id);
		expect(createArg.data.subjectId).toEqual(signedCredential.credentialSubject.id);
		expect(result).toBe(created);
	});

	test('re-signs and updates when the cached credential is stale and regenerateIfStale is true', async () => {
		const org = testOrganization as unknown as App.Organization;
		const staleCredential = {
			...storedCredential,
			json: { proof: { created: new Date('2000-01-01').toISOString() } }
		} as unknown as AchievementCredential;
		const updated = { ...staleCredential, id: 'updated' } as AchievementCredential;
		vi.mocked(prisma.achievementCredential.update).mockResolvedValue(updated);

		const result = await ensureClaimCredential({ ...baseClaim, credential: staleCredential }, org, {
			regenerateIfStale: true,
			creatorUserId: testUser.id
		});

		expect(achievementClaimToCredential).toHaveBeenCalledTimes(1);
		expect(prisma.achievementCredential.update).toHaveBeenCalledTimes(1);
		const updateArg = vi.mocked(prisma.achievementCredential.update).mock.calls[0][0];
		expect(updateArg.where).toEqual({ id: staleCredential.id });
		expect(prisma.achievementCredential.create).not.toHaveBeenCalled();
		expect(result).toBe(updated);
	});
});
