import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock('$env/dynamic/public', () => ({ env: mockEnv }));

import { getBulkAwardRequestIntervalMs } from './bulkAward';

describe('getBulkAwardRequestIntervalMs', () => {
	beforeEach(() => {
		delete mockEnv.PUBLIC_BULK_AWARD_REQUEST_INTERVAL_MS;
	});

	it('defaults to 500 ms when unset', () => {
		expect(getBulkAwardRequestIntervalMs()).toBe(500);
	});

	it('uses a configured non-negative number', () => {
		mockEnv.PUBLIC_BULK_AWARD_REQUEST_INTERVAL_MS = '250';
		expect(getBulkAwardRequestIntervalMs()).toBe(250);
	});

	it('allows 0 (no delay)', () => {
		mockEnv.PUBLIC_BULK_AWARD_REQUEST_INTERVAL_MS = '0';
		expect(getBulkAwardRequestIntervalMs()).toBe(0);
	});

	it.each(['abc', '-1', 'Infinity'])('falls back to 500 for %s', (value) => {
		mockEnv.PUBLIC_BULK_AWARD_REQUEST_INTERVAL_MS = value;
		expect(getBulkAwardRequestIntervalMs()).toBe(500);
	});
});
