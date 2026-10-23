import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDeleteMany = vi.hoisted(() => vi.fn());
const mockExchangeDeleteMany = vi.hoisted(() => vi.fn());
const mockEnv = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		message: { deleteMany: mockDeleteMany },
		credentialExchange: { deleteMany: mockExchangeDeleteMany }
	}
}));
vi.mock('$env/dynamic/private', () => mockEnv);

import { EXCHANGE_RETENTION_AFTER_EXPIRY_MS } from '$lib/server/exchange/constants';
import { MESSAGE_RETENTION_MS } from '$lib/server/messaging/constants';

import { GET, POST } from './+server';

function makeEvent(headers: Record<string, string> = {}) {
	return {
		request: new Request('https://orca.vercel.app/api/cron/purge-messages', { headers })
	} as unknown as Parameters<typeof GET>[0];
}

describe('cron/purge-messages', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv.env = { CRON_SECRET: 's3cret' };
		mockDeleteMany.mockResolvedValue({ count: 7 });
		mockExchangeDeleteMany.mockResolvedValue({ count: 3 });
	});

	it('401 with no secret', async () => {
		await expect(GET(makeEvent())).rejects.toMatchObject({ status: 401 });
		expect(mockDeleteMany).not.toHaveBeenCalled();
		expect(mockExchangeDeleteMany).not.toHaveBeenCalled();
	});

	it('401 with a wrong Bearer secret (same or different length)', async () => {
		await expect(GET(makeEvent({ authorization: 'Bearer s3creX' }))).rejects.toMatchObject({
			status: 401
		});
		await expect(GET(makeEvent({ authorization: 'Bearer nope' }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockDeleteMany).not.toHaveBeenCalled();
		expect(mockExchangeDeleteMany).not.toHaveBeenCalled();
	});

	it('401 when CRON_SECRET is unset, whatever is sent', async () => {
		mockEnv.env = {};
		await expect(GET(makeEvent({ authorization: 'Bearer ' }))).rejects.toMatchObject({
			status: 401
		});
		await expect(GET(makeEvent({ 'x-cron-secret': '' }))).rejects.toMatchObject({ status: 401 });
		expect(mockDeleteMany).not.toHaveBeenCalled();
		expect(mockExchangeDeleteMany).not.toHaveBeenCalled();
	});

	it("200 with Vercel's Bearer header, returning the deleted counts", async () => {
		const res = await GET(makeEvent({ authorization: 'Bearer s3cret' }));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ deleted: 7, exchangesDeleted: 3 });
	});

	it('purges messages past retention and exchanges past expiry + retention', async () => {
		vi.useFakeTimers();
		try {
			const now = new Date('2026-10-12T12:00:00Z');
			vi.setSystemTime(now);
			await GET(makeEvent({ authorization: 'Bearer s3cret' }));
			expect(mockDeleteMany).toHaveBeenCalledWith({
				where: { createdAt: { lt: new Date(now.getTime() - MESSAGE_RETENTION_MS) } }
			});
			expect(mockExchangeDeleteMany).toHaveBeenCalledWith({
				where: { expiresAt: { lt: new Date(now.getTime() - EXCHANGE_RETENTION_AFTER_EXPIRY_MS) } }
			});
		} finally {
			vi.useRealTimers();
		}
	});

	it('200 with the x-cron-secret header (manual calls), on POST too', async () => {
		const res = await POST(makeEvent({ 'x-cron-secret': 's3cret' }));
		expect(await res.json()).toEqual({ deleted: 7, exchangesDeleted: 3 });
	});
});
