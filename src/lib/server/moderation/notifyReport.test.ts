import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '$lib/../prisma/client';
import { sendUserMessage } from '$lib/server/messaging/sendUserMessage';
import { superadminOrgId } from '$lib/server/moderation/superadminOrg';

import { notifyReport } from './notifyReport';

vi.mock('$lib/../prisma/client', () => ({
	prisma: { user: { findMany: vi.fn() }, organization: { findUnique: vi.fn() } }
}));
vi.mock('$lib/server/messaging/sendUserMessage', () => ({ sendUserMessage: vi.fn() }));
vi.mock('$lib/server/moderation/superadminOrg', () => ({ superadminOrgId: vi.fn() }));
vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

const originOrg = {
	id: 'origin-1',
	email: 'origin@example.com',
	name: 'Origin Org',
	domain: 'origin.example.com',
	primaryColor: null,
	logo: null
};

const superOrg = {
	id: 'super-1',
	email: 'super@example.com',
	name: 'Superadmin Org',
	domain: 'super.example.com',
	primaryColor: null,
	logo: null
};

const report = { id: 'report-1', originOrgId: 'origin-1' };

const admin = (id: string) => ({ id, json: {}, identifiers: [] });

beforeEach(() => {
	vi.mocked(prisma.user.findMany).mockReset();
	vi.mocked(prisma.organization.findUnique).mockReset();
	vi.mocked(sendUserMessage).mockReset();
	vi.mocked(superadminOrgId).mockReset();
	vi.mocked(sendUserMessage).mockResolvedValue('sent');
});

describe('notifyReport', () => {
	it('notifies each origin-org admin with reading context = origin org and the reportId', async () => {
		vi.mocked(superadminOrgId).mockReturnValue(null); // no superadmin fan-out
		vi.mocked(prisma.user.findMany).mockResolvedValue([admin('a-1'), admin('a-2')] as never);

		await notifyReport({ report, originOrg });

		expect(sendUserMessage).toHaveBeenCalledTimes(2);
		for (const call of vi.mocked(sendUserMessage).mock.calls) {
			expect(call[0].org).toBe(originOrg);
			expect(call[0].type).toBe('CONTENT_REPORTED');
			expect(call[0].reportId).toBe('report-1');
		}
	});

	it('also notifies superadmin-org admins with reading context = superadmin org', async () => {
		vi.mocked(superadminOrgId).mockReturnValue('super-1');
		vi.mocked(prisma.organization.findUnique).mockResolvedValue(superOrg as never);
		vi.mocked(prisma.user.findMany)
			.mockResolvedValueOnce([admin('a-1')] as never) // origin admins
			.mockResolvedValueOnce([admin('s-1'), admin('s-2')] as never); // superadmin admins

		await notifyReport({ report, originOrg });

		expect(sendUserMessage).toHaveBeenCalledTimes(3);
		const ctxOrgs = vi.mocked(sendUserMessage).mock.calls.map((c) => c[0].org.id);
		expect(ctxOrgs).toEqual(['origin-1', 'super-1', 'super-1']);
		// Every message carries the same reportId, regardless of reading context.
		for (const call of vi.mocked(sendUserMessage).mock.calls) {
			expect(call[0].reportId).toBe('report-1');
		}
	});

	it('fails closed: unset SUPERADMIN_ORG_ID skips the superadmin fan-out, no throw', async () => {
		vi.mocked(superadminOrgId).mockReturnValue(null);
		vi.mocked(prisma.user.findMany).mockResolvedValue([admin('a-1')] as never);

		await expect(notifyReport({ report, originOrg })).resolves.toBeUndefined();

		expect(prisma.organization.findUnique).not.toHaveBeenCalled();
		expect(sendUserMessage).toHaveBeenCalledTimes(1);
		expect(vi.mocked(sendUserMessage).mock.calls[0][0].org).toBe(originOrg);
	});

	it('skips superadmin fan-out when the superadmin org is the origin org', async () => {
		vi.mocked(superadminOrgId).mockReturnValue('origin-1'); // same as origin
		vi.mocked(prisma.user.findMany).mockResolvedValue([admin('a-1')] as never);

		await notifyReport({ report, originOrg });

		expect(prisma.organization.findUnique).not.toHaveBeenCalled();
		expect(sendUserMessage).toHaveBeenCalledTimes(1);
	});

	it('does not throw when a recipient send fails (catches per recipient)', async () => {
		vi.mocked(superadminOrgId).mockReturnValue(null);
		vi.mocked(prisma.user.findMany).mockResolvedValue([admin('a-1'), admin('a-2')] as never);
		vi.mocked(sendUserMessage)
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce('sent');

		await expect(notifyReport({ report, originOrg })).resolves.toBeUndefined();
		expect(sendUserMessage).toHaveBeenCalledTimes(2);
	});

	it('builds the email link against the recipient org domain', async () => {
		vi.mocked(superadminOrgId).mockReturnValue('super-1');
		vi.mocked(prisma.organization.findUnique).mockResolvedValue(superOrg as never);
		vi.mocked(prisma.user.findMany)
			.mockResolvedValueOnce([admin('a-1')] as never)
			.mockResolvedValueOnce([admin('s-1')] as never);

		await notifyReport({ report, originOrg });

		const originEmail = vi.mocked(sendUserMessage).mock.calls[0][0].email;
		const superEmail = vi.mocked(sendUserMessage).mock.calls[1][0].email;
		// `email` is a builder; invoke with a known message id to inspect the link.
		const originBuilt = typeof originEmail === 'function' ? originEmail('msg-o') : originEmail;
		const superBuilt = typeof superEmail === 'function' ? superEmail('msg-s') : superEmail;
		expect(originBuilt.cta?.url).toBe('https://origin.example.com/messages/msg-o');
		expect(superBuilt.cta?.url).toBe('https://super.example.com/messages/msg-s');
	});
});
