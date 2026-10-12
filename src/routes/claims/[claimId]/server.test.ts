import { ClaimStatus, Visibility } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockEndorsementFindFirst = vi.hoisted(() => vi.fn());
const mockEndorsementCount = vi.hoisted(() => vi.fn());
const mockIsMemberOrOpen = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievementClaim: { findUnique: mockFindUnique, update: mockUpdate },
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

import { actions, load } from './+page.server';

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

describe('setVisibility', () => {
	const ownedClaim = (over: Record<string, unknown> = {}) => ({
		id: 'claim-1',
		userId: OWNER_ID,
		organizationId: 'org-1',
		...over
	});

	function actionEvent(s: App.SessionData | null, visibility?: string) {
		const fd = new FormData();
		if (visibility !== undefined) fd.set('visibility', visibility);
		return {
			locals: { org: ORG, session: s },
			params: { claimId: 'claim-1' },
			request: { formData: async () => fd }
		} as unknown as Parameters<typeof actions.setVisibility>[0];
	}

	async function run(s: App.SessionData | null, visibility?: string) {
		try {
			return { result: await actions.setVisibility(actionEvent(s, visibility)) };
		} catch (e) {
			return { status: (e as { status: number }).status };
		}
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdate.mockResolvedValue({});
	});

	for (const visibility of ['PUBLIC', 'COMMUNITY', 'PRIVATE']) {
		it(`the owner sets ${visibility}; only visibility is written`, async () => {
			mockFindUnique.mockResolvedValue(ownedClaim());
			const { result } = await run(session(OWNER_ID), visibility);
			expect(result).toEqual({ visibilityUpdated: true });
			expect(mockUpdate).toHaveBeenCalledTimes(1);
			expect(mockUpdate).toHaveBeenCalledWith({
				where: { id: 'claim-1' },
				data: { visibility }
			});
		});
	}

	it('a non-owner community user gets 404 and nothing is written', async () => {
		mockFindUnique.mockResolvedValue(ownedClaim());
		expect((await run(session(VIEWER_ID), 'PRIVATE')).status).toBe(404);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('a non-owner admin gets 404 and nothing is written', async () => {
		mockFindUnique.mockResolvedValue(ownedClaim());
		expect((await run(session(ADMIN_ID, 'GENERAL_ADMIN'), 'PRIVATE')).status).toBe(404);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('a claim in another org gets 404 and nothing is written', async () => {
		mockFindUnique.mockResolvedValue(ownedClaim({ organizationId: 'org-other' }));
		expect((await run(session(OWNER_ID), 'PRIVATE')).status).toBe(404);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('an unknown claim gets 404', async () => {
		mockFindUnique.mockResolvedValue(null);
		expect((await run(session(OWNER_ID), 'PRIVATE')).status).toBe(404);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('signed out gets 401', async () => {
		expect((await run(null, 'PRIVATE')).status).toBe(401);
		expect(mockFindUnique).not.toHaveBeenCalled();
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	for (const visibility of ['BANANA', undefined, 'ACHIEVEMENT']) {
		it(`rejects ${visibility ?? 'a missing value'} with 400 and writes nothing`, async () => {
			mockFindUnique.mockResolvedValue(ownedClaim());
			const { result } = await run(session(OWNER_ID), visibility);
			expect(result).toMatchObject({ status: 400, data: { visibilityInvalid: true } });
			expect(mockUpdate).not.toHaveBeenCalled();
		});
	}
});
