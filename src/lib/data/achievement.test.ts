import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '$lib/../prisma/client';

import { inviteToClaim } from './achievement';

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievement: { findFirstOrThrow: vi.fn() },
		identifier: { findFirst: vi.fn() },
		achievementClaim: { upsert: vi.fn() },
		claimEndorsement: { upsert: vi.fn() }
	}
}));
vi.mock('$lib/email/sendEmail', () => ({
	sendOrcaMail: vi.fn(async () => ({ success: true }))
}));
vi.mock('$lib/server/stewards', () => ({
	notifyStewardsForReview: vi.fn(),
	stewardIdsFor: () => []
}));
vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

const org = {
	id: 'org-1',
	email: 'org@example.com',
	name: 'Org',
	domain: 'org.example.com',
	primaryColor: null,
	logo: null,
	json: {}
} as unknown as Parameters<typeof inviteToClaim>[0]['org'];

const adminSession = {
	user: { id: 'admin-1', organizationId: 'org-1', orgRole: 'GENERAL_ADMIN' }
} as unknown as App.SessionData;

describe('inviteToClaim award path', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(prisma.achievement.findFirstOrThrow).mockResolvedValue({
			id: 'ach-1',
			name: 'Trail Steward',
			claimable: false,
			claimRequiresId: null,
			reviewRequiresId: null,
			json: {}
		} as never);
		vi.mocked(prisma.achievementClaim.upsert).mockResolvedValue({
			id: 'claim-1',
			validFrom: new Date()
		} as never);
		vi.mocked(prisma.claimEndorsement.upsert).mockResolvedValue({ id: 'end-1' } as never);
	});

	it.each(['PRIVATE', 'PUBLIC'] as const)(
		"a newly awarded claim takes the recipient's defaultVisibility (%s)",
		async (defaultVisibility) => {
			vi.mocked(prisma.identifier.findFirst).mockResolvedValue({
				id: 'ident-1',
				userId: 'recipient-1',
				verifiedAt: new Date(),
				user: { id: 'recipient-1', defaultVisibility }
			} as never);

			await inviteToClaim({
				achievementId: 'ach-1',
				org,
				inviteeEmail: 'recipient@example.com',
				json: '{}',
				session: adminSession
			});

			const { create } = vi.mocked(prisma.achievementClaim.upsert).mock.calls[0][0];
			expect(create.visibility).toBe(defaultVisibility);
		}
	);
});
