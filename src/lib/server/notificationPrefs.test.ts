import { describe, expect, it } from 'vitest';

import { emailNotificationsEnabled, setEmailNotifications } from './notificationPrefs';

describe('emailNotificationsEnabled', () => {
	it('defaults to true when json is null/empty/unset', () => {
		expect(emailNotificationsEnabled(null)).toBe(true);
		expect(emailNotificationsEnabled(undefined)).toBe(true);
		expect(emailNotificationsEnabled({})).toBe(true);
		expect(emailNotificationsEnabled({ notifications: {} })).toBe(true);
	});

	it('is false only when explicitly disabled', () => {
		expect(emailNotificationsEnabled({ notifications: { email: false } })).toBe(false);
		expect(emailNotificationsEnabled({ notifications: { email: true } })).toBe(true);
	});

	it('tolerates non-object shapes', () => {
		expect(emailNotificationsEnabled('nope')).toBe(true);
		expect(emailNotificationsEnabled(['a'])).toBe(true);
	});
});

describe('setEmailNotifications', () => {
	it('sets the flag while preserving other keys', () => {
		const out = setEmailNotifications({ theme: 'dark', notifications: { other: 1 } }, false);
		expect(out).toEqual({ theme: 'dark', notifications: { other: 1, email: false } });
	});

	it('creates the structure from empty json', () => {
		expect(setEmailNotifications(null, true)).toEqual({ notifications: { email: true } });
	});
});
