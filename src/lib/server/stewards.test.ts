import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '$lib/../prisma/client';
import { sendUserMessage } from '$lib/server/messaging/sendUserMessage';

import { isStewardUser, notifyStewardsForReview, stewardIdsFor } from './stewards';

vi.mock('$lib/../prisma/client', () => ({ prisma: { user: { findMany: vi.fn() } } }));
vi.mock('$lib/server/messaging/sendUserMessage', () => ({ sendUserMessage: vi.fn() }));
vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

describe('stewardIdsFor / isStewardUser', () => {
	it('extracts the steward id array from achievement json', () => {
		expect(stewardIdsFor({ json: { stewards: ['a', 'b'] } })).toEqual(['a', 'b']);
		expect(stewardIdsFor({ json: {} })).toEqual([]);
		expect(stewardIdsFor({ json: null })).toEqual([]);
		expect(stewardIdsFor({ json: { stewards: 'nope' } })).toEqual([]);
	});

	it('checks membership, false for empty/missing user', () => {
		const ach = { json: { stewards: ['u-1', 'u-2'] } };
		expect(isStewardUser(ach, 'u-1')).toBe(true);
		expect(isStewardUser(ach, 'u-3')).toBe(false);
		expect(isStewardUser(ach, null)).toBe(false);
		expect(isStewardUser({ json: {} }, 'u-1')).toBe(false);
	});
});

describe('notifyStewardsForReview', () => {
	const org = {
		id: 'org-1',
		email: 'org@example.com',
		name: 'Org',
		domain: 'org.example.com',
		primaryColor: null,
		logo: null
	};
	const steward = (id: string) => ({ id, json: {}, identifiers: [] });

	beforeEach(() => {
		vi.mocked(prisma.user.findMany).mockReset();
		vi.mocked(sendUserMessage).mockReset();
		vi.mocked(sendUserMessage).mockResolvedValue('sent');
	});

	it('notifies every current steward except the claimant', async () => {
		vi.mocked(prisma.user.findMany).mockResolvedValue([
			steward('s-1'),
			steward('s-2'),
			steward('claimant')
		] as never);

		await notifyStewardsForReview({
			achievement: { json: { stewards: ['s-1', 's-2', 'claimant'] }, name: 'Trail Steward' },
			org,
			achievementId: 'ach-1',
			claimId: 'claim-1',
			claimantUserId: 'claimant'
		});

		expect(sendUserMessage).toHaveBeenCalledTimes(2);
		const recipientIds = vi.mocked(sendUserMessage).mock.calls.map((c) => c[0].user.id);
		expect(recipientIds).toEqual(['s-1', 's-2']);
		// member-filtered query is org-scoped to the steward ids
		expect(vi.mocked(prisma.user.findMany).mock.calls[0][0]).toMatchObject({
			where: { id: { in: ['s-1', 's-2', 'claimant'] }, organizationId: 'org-1' }
		});
		// points at the claim's endorse page
		expect(vi.mocked(sendUserMessage).mock.calls[0][0].email.cta?.url).toBe(
			'https://org.example.com/claims/claim-1/endorse'
		);
	});

	it('does nothing when the achievement has no stewards', async () => {
		await notifyStewardsForReview({
			achievement: { json: {}, name: 'X' },
			org,
			achievementId: 'ach-1',
			claimId: 'claim-1',
			claimantUserId: 'claimant'
		});
		expect(prisma.user.findMany).not.toHaveBeenCalled();
		expect(sendUserMessage).not.toHaveBeenCalled();
	});

	it('continues past a single steward send failure', async () => {
		vi.mocked(prisma.user.findMany).mockResolvedValue([steward('s-1'), steward('s-2')] as never);
		vi.mocked(sendUserMessage).mockRejectedValueOnce(new Error('boom')).mockResolvedValue('sent');
		await notifyStewardsForReview({
			achievement: { json: { stewards: ['s-1', 's-2'] }, name: 'X' },
			org,
			achievementId: 'ach-1',
			claimId: 'claim-1',
			claimantUserId: 'other'
		});
		expect(sendUserMessage).toHaveBeenCalledTimes(2);
	});
});
