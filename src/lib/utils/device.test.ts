import { describe, expect, it } from 'vitest';

import { isMobileDevice } from './device';

const nav = (userAgent: string, extra: { maxTouchPoints?: number; mobile?: boolean } = {}) => ({
	userAgent,
	maxTouchPoints: extra.maxTouchPoints ?? 0,
	...(extra.mobile === undefined ? {} : { userAgentData: { mobile: extra.mobile } })
});

describe('isMobileDevice', () => {
	it('trusts userAgentData.mobile when the browser provides it', () => {
		expect(isMobileDevice(nav('Mozilla/5.0 (Linux; Android 14)', { mobile: false }))).toBe(false);
		expect(isMobileDevice(nav('Mozilla/5.0 (X11; Linux x86_64)', { mobile: true }))).toBe(true);
	});

	it('detects phones from the user agent', () => {
		expect(isMobileDevice(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'))).toBe(
			true
		);
		expect(isMobileDevice(nav('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari'))).toBe(
			true
		);
	});

	it('detects iPadOS, which reports a desktop user agent, by touch support', () => {
		const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
		expect(isMobileDevice(nav(ua, { maxTouchPoints: 5 }))).toBe(true);
		expect(isMobileDevice(nav(ua))).toBe(false);
	});

	it('treats desktop browsers and a missing navigator as not mobile', () => {
		expect(isMobileDevice(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141'))).toBe(false);
		expect(isMobileDevice(undefined)).toBe(false);
	});
});
