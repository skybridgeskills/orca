import { beforeEach, describe, expect, it, vi } from 'vitest';

// P4 inbox: the recipient's reading context. A NORMAL org-scoped query — the load must
// list ONLY the viewer's own messages in their current org (userId + organizationId),
// newest first. No un-scoped reads.

const mockMessageFindMany = vi.hoisted(() => vi.fn());
const mockMessageCount = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		message: { findMany: mockMessageFindMany, count: mockMessageCount }
	}
}));

import { load } from './+page.server';

function makeEvent(orgId: string | null, userId?: string) {
	return {
		url: new URL('https://x.test/messages'),
		locals: {
			org: orgId ? { id: orgId } : null,
			session: userId ? { user: { id: userId } } : null
		}
	} as unknown as Parameters<typeof load>[0];
}

describe('messages inbox load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMessageFindMany.mockResolvedValue([]);
		mockMessageCount.mockResolvedValue(0);
	});

	it('redirects logged-out users to /', async () => {
		await expect(load(makeEvent('org-1'))).rejects.toMatchObject({ status: 302, location: '/' });
		expect(mockMessageFindMany).not.toHaveBeenCalled();
	});

	it('lists only my messages in this org (userId + organizationId scope), newest first', async () => {
		mockMessageFindMany.mockResolvedValue([
			{
				id: 'm1',
				type: 'CONTENT_REPORTED',
				createdAt: new Date(),
				report: { targetType: 'ACHIEVEMENT', reason: 'spam', reporterUserId: 'reporter-x' }
			}
		]);
		mockMessageCount.mockResolvedValue(1);

		const result = (await load(makeEvent('org-1', 'me'))) as {
			messages: Array<{ id: string; report: { reason: string } | null }>;
			count: number;
		};

		const args = mockMessageFindMany.mock.calls[0][0];
		expect(args.where).toEqual({ userId: 'me', organizationId: 'org-1' });
		expect(args.orderBy).toEqual({ createdAt: 'desc' });
		// count shares the identical where.
		expect(mockMessageCount.mock.calls[0][0].where).toEqual(args.where);

		expect(result.count).toBe(1);
		expect(result.messages).toHaveLength(1);
		// Reporter identity is NEVER projected onto inbox rows.
		expect(result.messages[0].report).toEqual({ targetType: 'ACHIEVEMENT', reason: 'spam' });
		expect(JSON.stringify(result.messages[0])).not.toContain('reporter-x');
	});
});
