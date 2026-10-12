import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '$lib/../prisma/client';
import { sendOrcaMail } from '$lib/email/sendEmail';

import { inviteToClaim } from './achievement';

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievement: { findFirstOrThrow: vi.fn() },
		identifier: { findFirst: vi.fn() },
		achievementClaim: { upsert: vi.fn() },
		claimEndorsement: { upsert: vi.fn(), findFirst: vi.fn() }
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

describe('inviteToClaim emailIfNew (bulk award re-runs)', () => {
	const existingEndorsement = { id: 'end-1', creatorId: 'admin-1', achievementId: 'ach-1' };
	const verifiedRecipient = {
		id: 'ident-1',
		userId: 'recipient-1',
		verifiedAt: new Date(),
		user: { id: 'recipient-1', defaultVisibility: 'PRIVATE' }
	};

	const award = (emailIfNew?: boolean) =>
		inviteToClaim({
			achievementId: 'ach-1',
			org,
			inviteeEmail: 'recipient@example.com',
			json: '{}',
			session: adminSession,
			emailIfNew
		});

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
		vi.mocked(prisma.claimEndorsement.upsert).mockResolvedValue({
			id: 'end-1',
			achievementId: 'ach-1'
		} as never);
		vi.mocked(prisma.claimEndorsement.findFirst).mockResolvedValue(null);
	});

	describe.each([
		['an existing member (award email)', verifiedRecipient],
		['someone not yet a member (invite email)', null]
	])('for %s', (_label, identifier) => {
		beforeEach(() => {
			vi.mocked(prisma.identifier.findFirst).mockResolvedValue(identifier as never);
		});

		it('sends the email the first time', async () => {
			const result = await award(true);

			expect(sendOrcaMail).toHaveBeenCalledTimes(1);
			expect(vi.mocked(sendOrcaMail).mock.calls[0][0].to).toBe('recipient@example.com');
			expect(result.data.created).toBe(true);
		});

		it('sends no email on a re-award when an endorsement already exists', async () => {
			vi.mocked(prisma.claimEndorsement.findFirst).mockResolvedValue(existingEndorsement as never);

			const result = await award(true);

			expect(prisma.claimEndorsement.findFirst).toHaveBeenCalledWith({
				where: {
					creatorId: 'admin-1',
					achievementId: 'ach-1',
					inviteeEmail: 'recipient@example.com'
				}
			});
			expect(sendOrcaMail).not.toHaveBeenCalled();
			expect(result.data.created).toBe(false);
		});

		it('still emails on every award when emailIfNew is not set', async () => {
			vi.mocked(prisma.claimEndorsement.findFirst).mockResolvedValue(existingEndorsement as never);

			const result = await award();

			expect(prisma.claimEndorsement.findFirst).not.toHaveBeenCalled();
			expect(sendOrcaMail).toHaveBeenCalledTimes(1);
			expect(result.data.created).toBe(true);
		});
	});
});
