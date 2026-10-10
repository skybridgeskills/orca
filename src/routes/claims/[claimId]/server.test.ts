import { ClaimStatus, Visibility } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockEndorsementFindFirst = vi.hoisted(() => vi.fn());
const mockEndorsementCount = vi.hoisted(() => vi.fn());
const mockIsMemberOrOpen = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievementClaim: { findUnique: mockFindUnique },
		claimEndorsement: { findFirst: mockEndorsementFindFirst, count: mockEndorsementCount }
	}
}));

vi.mock('$lib/server/moderation/suspension', () => ({
	activeSuspensionFor: vi.fn().mockResolvedValue(null)
}));

vi.mock('$lib/data/achievement', () => ({
	getAchievement: vi.fn().mockResolvedValue({ id: 'ach-1', claimable: false })
}));

vi.mock('$lib/server/transactionService/config', () => ({
	isExchangeEnabled: vi.fn().mockReturnValue(false)
}));

vi.mock('$lib/server/permissions', () => ({ isMemberOrOpen: mockIsMemberOrOpen }));

import { load } from './+page.server';

const ORG = { id: 'org-1', json: {} } as App.Organization;
const OWNER_ID = 'user-owner';
const VIEWER_ID = 'user-viewer';
const ADMIN_ID = 'user-admin';

function buildClaim(visibility: Visibility, over: Record<string, unknown> = {}) {
	return {
		id: 'claim-1',
		organizationId: 'org-1',
		userId: OWNER_ID,
		achievementId: 'ach-1',
		claimStatus: ClaimStatus.ACCEPTED,
		visibility,
		user: { id: OWNER_ID },
		...over
	};
}

function session(userId: string, orgRole: string | null = 'MEMBER'): App.SessionData {
	return { user: { id: userId, organizationId: 'org-1', orgRole } } as App.SessionData;
}

function makeEvent(s: App.SessionData | null) {
	return {
		locals: { org: ORG, session: s },
		params: { claimId: 'claim-1' },
		url: new URL('https://example.com/claims/claim-1')
	} as unknown as Parameters<typeof load>[0];
}

async function loadStatus(s: App.SessionData | null): Promise<number> {
	try {
		await load(makeEvent(s));
		return 200;
	} catch (e) {
		return (e as { status: number }).status;
	}
}

describe('load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEndorsementFindFirst.mockResolvedValue(null);
		mockEndorsementCount.mockResolvedValue(0);
	});

	it('a signed-in non-member gets 404 on a COMMUNITY claim', async () => {
		mockFindUnique.mockResolvedValue(buildClaim(Visibility.COMMUNITY));
		mockIsMemberOrOpen.mockResolvedValue(false);
		expect(await loadStatus(session(VIEWER_ID))).toBe(404);
		expect(mockIsMemberOrOpen).toHaveBeenCalledTimes(1);
	});

	it('a signed-in non-member gets 404 on an ACHIEVEMENT claim', async () => {
		mockFindUnique.mockResolvedValue(buildClaim(Visibility.ACHIEVEMENT));
		mockIsMemberOrOpen.mockResolvedValue(false);
		expect(await loadStatus(session(VIEWER_ID))).toBe(404);
	});

	it('the same viewer sees a PUBLIC claim without a membership lookup', async () => {
		mockFindUnique.mockResolvedValue(buildClaim(Visibility.PUBLIC));
		expect(await loadStatus(session(VIEWER_ID))).toBe(200);
		expect(mockIsMemberOrOpen).not.toHaveBeenCalled();
	});

	it('a member (or any user when membership is unset) sees a COMMUNITY claim', async () => {
		mockFindUnique.mockResolvedValue(buildClaim(Visibility.COMMUNITY));
		mockIsMemberOrOpen.mockResolvedValue(true);
		const result = (await load(makeEvent(session(VIEWER_ID)))) as { viewer: string };
		expect(result.viewer).toBe('community');
	});

	it('an admin sees a COMMUNITY claim without a membership lookup', async () => {
		mockFindUnique.mockResolvedValue(buildClaim(Visibility.COMMUNITY));
		const result = (await load(makeEvent(session(ADMIN_ID, 'GENERAL_ADMIN')))) as {
			viewer: string;
		};
		expect(result.viewer).toBe('admin');
		expect(mockIsMemberOrOpen).not.toHaveBeenCalled();
	});

	it('the owner sees their PRIVATE claim', async () => {
		mockFindUnique.mockResolvedValue(buildClaim(Visibility.PRIVATE));
		const result = (await load(makeEvent(session(OWNER_ID)))) as { viewer: string };
		expect(result.viewer).toBe('owner');
		expect(mockIsMemberOrOpen).not.toHaveBeenCalled();
	});

	it('a member gets 404 on someone else’s PRIVATE claim', async () => {
		mockFindUnique.mockResolvedValue(buildClaim(Visibility.PRIVATE));
		mockIsMemberOrOpen.mockResolvedValue(true);
		expect(await loadStatus(session(VIEWER_ID))).toBe(404);
	});

	it('a claim in another org is 404', async () => {
		mockFindUnique.mockResolvedValue(
			buildClaim(Visibility.PUBLIC, { organizationId: 'org-other' })
		);
		expect(await loadStatus(session(VIEWER_ID))).toBe(404);
	});

	it('signed out redirects to the public view', async () => {
		expect(await loadStatus(null)).toBe(307);
		expect(mockFindUnique).not.toHaveBeenCalled();
	});
});
