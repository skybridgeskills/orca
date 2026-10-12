import { beforeEach, describe, expect, it, vi } from 'vitest';

// The invite detail page: org-scoped, redirects to the claim once accepted, and
// visible only to org admins and the invite's creator.

const mockEndorsementFindUnique = vi.hoisted(() => vi.fn());
const mockGetAchievement = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		claimEndorsement: { findUnique: mockEndorsementFindUnique }
	}
}));
vi.mock('$lib/data/achievement', () => ({ getAchievement: mockGetAchievement }));

import { load } from './+page.server';

const INVITE = {
	id: 'inv-1',
	organizationId: 'org-1',
	achievementId: 'ach-1',
	claimId: null,
	creatorId: 'creator-1',
	inviteeEmail: 'someone@example.com',
	creator: { id: 'creator-1' }
};

function makeEvent(user: unknown) {
	return {
		url: new URL('https://org.example.com/invites/inv-1'),
		params: { inviteId: 'inv-1' },
		locals: { org: { id: 'org-1' }, session: user ? { user } : null }
	} as unknown as Parameters<typeof load>[0];
}

const member = (id: string, orgRole: string | null = null) => ({ id, orgRole });

describe('invites/[inviteId] load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEndorsementFindUnique.mockResolvedValue(INVITE);
		mockGetAchievement.mockResolvedValue({ id: 'ach-1', name: 'Trail Steward' });
	});

	it('sends a logged-out visitor to login', async () => {
		await expect(load(makeEvent(null))).rejects.toMatchObject({
			status: 303,
			location: '/login?next=%2Finvites%2Finv-1'
		});
	});

	it("404s for another org's invite", async () => {
		mockEndorsementFindUnique.mockResolvedValue({ ...INVITE, organizationId: 'org-2' });
		await expect(load(makeEvent(member('admin-1', 'GENERAL_ADMIN')))).rejects.toMatchObject({
			status: 404
		});
	});

	it('404s for a missing invite', async () => {
		mockEndorsementFindUnique.mockResolvedValue(null);
		await expect(load(makeEvent(member('admin-1', 'GENERAL_ADMIN')))).rejects.toMatchObject({
			status: 404
		});
	});

	it('redirects to the claim once the invite has one', async () => {
		mockEndorsementFindUnique.mockResolvedValue({ ...INVITE, claimId: 'claim-9' });
		await expect(load(makeEvent(member('admin-1', 'GENERAL_ADMIN')))).rejects.toMatchObject({
			status: 303,
			location: '/claims/claim-9'
		});
	});

	it.each([null, 'BILLING_ADMIN'])(
		'403s for a non-admin (%s) who is not the creator',
		async (orgRole) => {
			await expect(load(makeEvent(member('other-1', orgRole)))).rejects.toMatchObject({
				status: 403
			});
		}
	);

	it.each(['GENERAL_ADMIN', 'CONTENT_ADMIN'])('allows an admin (%s)', async (orgRole) => {
		const result = (await load(makeEvent(member('admin-1', orgRole)))) as {
			invite: { id: string };
			canDelete: boolean;
		};
		expect(result.invite.id).toBe('inv-1');
		expect(result.canDelete).toBe(true);
		expect(mockGetAchievement).toHaveBeenCalledWith('ach-1', 'org-1');
	});

	it('allows the creator', async () => {
		const result = (await load(makeEvent(member('creator-1')))) as {
			invite: { id: string };
			canDelete: boolean;
		};
		expect(result.invite.id).toBe('inv-1');
		expect(result.canDelete).toBe(true);
	});
});
