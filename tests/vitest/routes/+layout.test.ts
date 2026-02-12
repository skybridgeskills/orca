import { describe, it, expect, vi } from 'vitest';
import { getFooterUrl } from '$lib/utils/footer-links';

describe('+layout.svelte footer links integration', () => {
	it('getFooterUrl is exported and callable', () => {
		// Verify the function exists and can be called
		expect(typeof getFooterUrl).toBe('function');
	});

	it('getFooterUrl returns default values when env vars not set', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: undefined,
			PUBLIC_TERMS_URL: undefined,
			PUBLIC_CONTACT_URL: undefined
		};

		expect(getFooterUrl('privacy', '/privacy', envOverride)).toBe('/privacy');
		expect(getFooterUrl('terms', '/terms', envOverride)).toBe('/terms');
		expect(getFooterUrl('contact', '/contact', envOverride)).toBe('/contact');
	});

	it('getFooterUrl returns env var values when set', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: 'https://example.com/privacy',
			PUBLIC_TERMS_URL: 'https://example.com/terms',
			PUBLIC_CONTACT_URL: 'https://example.com/contact'
		};

		expect(getFooterUrl('privacy', '/privacy', envOverride)).toBe('https://example.com/privacy');
		expect(getFooterUrl('terms', '/terms', envOverride)).toBe('https://example.com/terms');
		expect(getFooterUrl('contact', '/contact', envOverride)).toBe('https://example.com/contact');
	});
});
