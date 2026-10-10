import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Notification, notifications } from './notificationStore';

describe('notifications', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		for (const n of get(notifications)) notifications.dismiss(n.id);
		vi.useRealTimers();
	});

	it('keeps a notification until it is dismissed when no auto-dismiss is set', () => {
		const n = new Notification('Stays');
		notifications.add(n);
		vi.advanceTimersByTime(60_000);
		expect(get(notifications).map((x) => x.id)).toContain(n.id);
		notifications.dismiss(n.id);
		expect(get(notifications).map((x) => x.id)).not.toContain(n.id);
	});

	it('removes an auto-dismissing notification after its delay, leaving others', () => {
		const sticky = new Notification('Stays');
		const brief = new Notification('Goes', true, 'success', [], 4000);
		notifications.add(sticky);
		notifications.add(brief);

		vi.advanceTimersByTime(3999);
		expect(get(notifications).map((x) => x.id)).toEqual([sticky.id, brief.id]);

		vi.advanceTimersByTime(1);
		expect(get(notifications).map((x) => x.id)).toEqual([sticky.id]);
	});

	it('does nothing when an auto-dismissing notification was already closed', () => {
		const brief = new Notification('Goes', true, 'success', [], 4000);
		notifications.add(brief);
		notifications.dismiss(brief.id);
		vi.advanceTimersByTime(4000);
		expect(get(notifications)).toEqual([]);
	});
});
