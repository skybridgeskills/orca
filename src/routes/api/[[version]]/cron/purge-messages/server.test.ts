import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDeleteMany = vi.hoisted(() => vi.fn());
const mockEnv = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));

vi.mock('$lib/../prisma/client', () => ({
	prisma: { message: { deleteMany: mockDeleteMany } }
}));
vi.mock('$env/dynamic/private', () => mockEnv);

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
	});

	it('401 with no secret', async () => {
		await expect(GET(makeEvent())).rejects.toMatchObject({ status: 401 });
		expect(mockDeleteMany).not.toHaveBeenCalled();
	});

	it('401 with a wrong Bearer secret (same or different length)', async () => {
		await expect(GET(makeEvent({ authorization: 'Bearer s3creX' }))).rejects.toMatchObject({
			status: 401
		});
		await expect(GET(makeEvent({ authorization: 'Bearer nope' }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockDeleteMany).not.toHaveBeenCalled();
	});

	it('401 when CRON_SECRET is unset, whatever is sent', async () => {
		mockEnv.env = {};
		await expect(GET(makeEvent({ authorization: 'Bearer ' }))).rejects.toMatchObject({
			status: 401
		});
		await expect(GET(makeEvent({ 'x-cron-secret': '' }))).rejects.toMatchObject({ status: 401 });
		expect(mockDeleteMany).not.toHaveBeenCalled();
	});

	it("200 with Vercel's Bearer header, returning the deleted count", async () => {
		const res = await GET(makeEvent({ authorization: 'Bearer s3cret' }));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ deleted: 7 });
		const { where } = mockDeleteMany.mock.calls[0][0];
		expect(where.createdAt.lt).toBeInstanceOf(Date);
	});

	it('200 with the x-cron-secret header (manual calls), on POST too', async () => {
		const res = await POST(makeEvent({ 'x-cron-secret': 's3cret' }));
		expect(await res.json()).toEqual({ deleted: 7 });
	});
});
