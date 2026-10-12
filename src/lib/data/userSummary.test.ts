import { describe, expect, it } from 'vitest';

import { userLabel } from './userSummary';

describe('userLabel', () => {
	it('full name', () => {
		expect(userLabel({ givenName: 'Jane', familyName: 'Doe', email: 'j@x.test' })).toBe('Jane Doe');
	});

	it('given name only', () => {
		expect(userLabel({ givenName: 'Jane', familyName: null })).toBe('Jane');
	});

	it('falls back to email', () => {
		expect(userLabel({ givenName: ' ', familyName: null, email: 'j@x.test' })).toBe('j@x.test');
	});

	it('null without a name or email', () => {
		expect(userLabel({ givenName: null, familyName: null, email: null })).toBeNull();
		expect(userLabel({ givenName: null, familyName: null })).toBeNull();
	});
});
