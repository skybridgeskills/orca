import type { Organization } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '$lib/../prisma/client';

import { authenticateBearer } from './accessToken';

vi.mock('$lib/../prisma/client', () => ({
	prisma: { oAuthAccessToken: { findFirst: vi.fn(), update: vi.fn() } }
}));

const ORG = { id: 'org-1' } as Organization;

function tokenRow(
	client: { clientType: 'CONFIDENTIAL_SERVICE' | 'USER_DELEGATED'; createdByUserId: string | null },
	userId: string | null
) {
	return {
		id: 'tok-1',
		userId,
		scopes: ['AchievementClaim.readonly'],
		revokedAt: null,
		accessTokenExpiresAt: new Date(Date.now() + 60_000),
		client: { id: 'client-1', disabledAt: null, ...client }
	};
}

describe('authenticateBearer: ownerless service apps', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects a service-app token whose creator is gone, without touching lastUsedAt', async () => {
		vi.mocked(prisma.oAuthAccessToken.findFirst).mockResolvedValue(
			tokenRow({ clientType: 'CONFIDENTIAL_SERVICE', createdByUserId: null }, null) as never
		);

		expect(await authenticateBearer(ORG, 'raw')).toBeNull();
		expect(prisma.oAuthAccessToken.update).not.toHaveBeenCalled();
	});

	it('authenticates a service-app token that has an owner, acting as the owner', async () => {
		vi.mocked(prisma.oAuthAccessToken.findFirst).mockResolvedValue(
			tokenRow({ clientType: 'CONFIDENTIAL_SERVICE', createdByUserId: 'admin-1' }, null) as never
		);

		const auth = await authenticateBearer(ORG, 'raw');
		expect(auth).toMatchObject({ userId: null, actingUserId: 'admin-1' });
		expect(prisma.oAuthAccessToken.update).toHaveBeenCalledTimes(1);
	});

	it('leaves user-delegated tokens alone even when the client has no creator', async () => {
		vi.mocked(prisma.oAuthAccessToken.findFirst).mockResolvedValue(
			tokenRow({ clientType: 'USER_DELEGATED', createdByUserId: null }, 'user-1') as never
		);

		const auth = await authenticateBearer(ORG, 'raw');
		expect(auth).toMatchObject({ userId: 'user-1', actingUserId: 'user-1' });
	});
});
