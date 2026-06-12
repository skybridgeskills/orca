import { ClaimStatus, Visibility } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as m from '$lib/i18n/messages';

const mockFindUnique = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: { achievementClaim: { findUnique: mockFindUnique } }
}));

import { load } from './+page.server';

const ORG = { id: 'org-1' } as App.Organization;

function buildClaim(over: Record<string, unknown> = {}) {
	return {
		id: 'claim-1',
		organizationId: 'org-1',
		userId: 'user-1',
		claimStatus: ClaimStatus.ACCEPTED,
		visibility: Visibility.PUBLIC,
		endorsements: [],
		achievement: {},
		...over
	};
}

function makeEvent() {
	return {
		locals: { org: ORG },
		params: { claimId: 'claim-1' }
	} as Parameters<typeof load>[0];
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

describe('GET /claims/[claimId]/public', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('serves a PUBLIC accepted claim', async () => {
		mockFindUnique.mockResolvedValue(buildClaim({ visibility: Visibility.PUBLIC }));
		const result = (await load(makeEvent())) as { claim: { id: string } };
		expect(result.claim.id).toBe('claim-1');
	});

	for (const visibility of [Visibility.COMMUNITY, Visibility.ACHIEVEMENT, Visibility.PRIVATE]) {
		it(`returns 404 for a non-PUBLIC (${visibility}) claim`, async () => {
			mockFindUnique.mockResolvedValue(buildClaim({ visibility }));
			try {
				await load(makeEvent());
				expect.fail('expected throw');
			} catch (e) {
				expect(isKitError(e)).toBe(true);
				if (isKitError(e)) {
					expect(e.status).toBe(404);
					expect(e.body.message).toBe(m.best_sharp_lamb_enchant());
				}
			}
		});
	}
});
