import { describe, expect, it } from 'vitest';

import { isAdmin, isGeneralAdmin } from './isAdmin';

describe('isAdmin', () => {
	it('returns true for GENERAL_ADMIN and CONTENT_ADMIN', () => {
		expect(isAdmin({ orgRole: 'GENERAL_ADMIN' })).toBe(true);
		expect(isAdmin({ orgRole: 'CONTENT_ADMIN' })).toBe(true);
	});

	it('returns false for non-admin roles, null, and undefined', () => {
		expect(isAdmin({ orgRole: 'BILLING_ADMIN' })).toBe(false);
		expect(isAdmin({ orgRole: 'MEMBER' })).toBe(false);
		expect(isAdmin({ orgRole: null })).toBe(false);
		expect(isAdmin(undefined)).toBe(false);
		expect(isAdmin(null)).toBe(false);
	});
});

describe('isGeneralAdmin', () => {
	it('returns true only for GENERAL_ADMIN', () => {
		expect(isGeneralAdmin({ orgRole: 'GENERAL_ADMIN' })).toBe(true);
		expect(isGeneralAdmin({ orgRole: 'CONTENT_ADMIN' })).toBe(false);
		expect(isGeneralAdmin({ orgRole: 'BILLING_ADMIN' })).toBe(false);
		expect(isGeneralAdmin({ orgRole: null })).toBe(false);
		expect(isGeneralAdmin(undefined)).toBe(false);
	});
});
