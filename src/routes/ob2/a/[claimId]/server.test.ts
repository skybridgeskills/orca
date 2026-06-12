import { ClaimStatus, Visibility } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as m from '$lib/i18n/messages';

const mockFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockBadgeAssertion = vi.hoisted(() => vi.fn());

vi.mock('../../../../prisma/client', () => ({
	prisma: { achievementClaim: { findUniqueOrThrow: mockFindUniqueOrThrow } }
}));

vi.mock('$lib/ob2/badgeAssertion', () => ({
	badgeAssertionFromAchievementClaim: mockBadgeAssertion
}));

import { GET } from './+server';

const ORG = { id: 'org-1' } as App.Organization;

function buildClaim(over: Record<string, unknown> = {}) {
	return {
		id: 'claim-1',
		organizationId: 'org-1',
		userId: 'user-1',
		claimStatus: ClaimStatus.ACCEPTED,
		validFrom: new Date('2020-01-01'),
		visibility: Visibility.PUBLIC,
		...over
	};
}

function makeEvent() {
	// JSON Accept header so we hit the non-HTML (assertion) branch.
	return {
		request: new Request('https://example.com/ob2/a/claim-1', {
			headers: { Accept: 'application/json' }
		}),
		locals: { org: ORG, session: null },
		params: { claimId: 'claim-1' }
	} as unknown as Parameters<typeof GET>[0];
}

function isKitError(e: unknown): e is { status: number; body: { message: string } } {
	return (
		typeof e === 'object' &&
		e !== null &&
		'status' in e &&
		'body' in e &&
		typeof (e as { body: unknown }).body === 'object'
	);
}

describe('GET /ob2/a/[claimId]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBadgeAssertion.mockReturnValue({ id: 'assertion' });
	});

	it('serves the assertion for a PUBLIC accepted claim', async () => {
		mockFindUniqueOrThrow.mockResolvedValue(buildClaim({ visibility: Visibility.PUBLIC }));
		const res = await GET(makeEvent());
		expect(res?.status).toBe(200);
		expect(mockBadgeAssertion).toHaveBeenCalledOnce();
	});

	for (const visibility of [Visibility.COMMUNITY, Visibility.ACHIEVEMENT, Visibility.PRIVATE]) {
		it(`returns 404 for a non-PUBLIC (${visibility}) claim`, async () => {
			mockFindUniqueOrThrow.mockResolvedValue(buildClaim({ visibility }));
			try {
				await GET(makeEvent());
				expect.fail('expected throw');
			} catch (e) {
				expect(isKitError(e)).toBe(true);
				if (isKitError(e)) {
					expect(e.status).toBe(404);
					expect(e.body.message).toBe(m.sharp_flat_kite_clasp());
				}
			}
			expect(mockBadgeAssertion).not.toHaveBeenCalled();
		});
	}
});
