import { MessageType, type Identifier } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '$lib/../prisma/client';
import { sendOrcaMail } from '$lib/email/sendEmail';


import { sendUserMessage, type SendUserMessageArgs } from './sendUserMessage';

vi.mock('$lib/../prisma/client', () => ({
	prisma: { message: { findFirst: vi.fn(), create: vi.fn() } }
}));
vi.mock('$lib/email/sendEmail', () => ({ sendOrcaMail: vi.fn() }));
vi.mock('$lib/email/template', () => ({ renderOrcaEmail: vi.fn(() => '<html></html>') }));

const verifiedEmail = (): Identifier =>
	({
		id: 'id-1',
		type: 'EMAIL',
		identifier: 'steward@example.com',
		verifiedAt: new Date(),
		organizationId: 'org-1',
		userId: 'user-1',
		visibility: 'COMMUNITY'
	}) as Identifier;

const args = (over: Partial<SendUserMessageArgs> = {}): SendUserMessageArgs => ({
	org: { id: 'org-1', email: 'org@example.com', name: 'Org', primaryColor: null, logo: null },
	user: { id: 'user-1', json: {}, identifiers: [verifiedEmail()] },
	type: MessageType.REVIEW_NEEDED,
	achievementId: 'ach-1',
	claimId: 'claim-1',
	email: { subject: 's', title: 't', text: 'plain' },
	...over
});

beforeEach(() => {
	vi.mocked(prisma.message.findFirst).mockReset();
	vi.mocked(prisma.message.create).mockReset();
	vi.mocked(sendOrcaMail).mockReset();
});

describe('sendUserMessage', () => {
	it('suppresses when email notifications are disabled (no send, no record)', async () => {
		const result = await sendUserMessage(
			args({
				user: {
					id: 'user-1',
					json: { notifications: { email: false } },
					identifiers: [verifiedEmail()]
				}
			})
		);
		expect(result).toBe('suppressed_pref');
		expect(prisma.message.findFirst).not.toHaveBeenCalled();
		expect(sendOrcaMail).not.toHaveBeenCalled();
		expect(prisma.message.create).not.toHaveBeenCalled();
	});

	it('suppresses within the throttle window (no send, no record)', async () => {
		vi.mocked(prisma.message.findFirst).mockResolvedValue({ id: 'm-1' } as never);
		const result = await sendUserMessage(args());
		expect(result).toBe('suppressed_throttle');
		expect(sendOrcaMail).not.toHaveBeenCalled();
		expect(prisma.message.create).not.toHaveBeenCalled();
	});

	it('returns failed when there is no verified email (no record)', async () => {
		vi.mocked(prisma.message.findFirst).mockResolvedValue(null as never);
		const result = await sendUserMessage(
			args({ user: { id: 'user-1', json: {}, identifiers: [] } })
		);
		expect(result).toBe('failed');
		expect(sendOrcaMail).not.toHaveBeenCalled();
		expect(prisma.message.create).not.toHaveBeenCalled();
	});

	it('sends and records on the happy path', async () => {
		vi.mocked(prisma.message.findFirst).mockResolvedValue(null as never);
		vi.mocked(sendOrcaMail).mockResolvedValue({ success: true });
		vi.mocked(prisma.message.create).mockResolvedValue({ id: 'm-1' } as never);
		const result = await sendUserMessage(args());
		expect(result).toBe('sent');
		expect(sendOrcaMail).toHaveBeenCalledOnce();
		expect(prisma.message.create).toHaveBeenCalledOnce();
		expect(vi.mocked(prisma.message.create).mock.calls[0][0]).toMatchObject({
			data: {
				organizationId: 'org-1',
				userId: 'user-1',
				type: 'REVIEW_NEEDED',
				achievementId: 'ach-1',
				claimId: 'claim-1'
			}
		});
	});

	it('returns failed and records nothing when the send fails', async () => {
		vi.mocked(prisma.message.findFirst).mockResolvedValue(null as never);
		vi.mocked(sendOrcaMail).mockResolvedValue({ success: false, error: { message: 'boom' } });
		const result = await sendUserMessage(args());
		expect(result).toBe('failed');
		expect(prisma.message.create).not.toHaveBeenCalled();
	});
});
