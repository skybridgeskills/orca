import { describe, it, expect } from 'vitest';
import { getFooterUrl } from '$lib/utils/footer-links';

describe('getFooterUrl', () => {
	it('returns environment variable value when PUBLIC_PRIVACY_URL is set', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: 'https://example.com/privacy',
			PUBLIC_TERMS_URL: undefined,
			PUBLIC_CONTACT_URL: undefined
		};
		const result = getFooterUrl('privacy', '/privacy', envOverride);
		expect(result).toBe('https://example.com/privacy');
	});

	it('returns default value when PUBLIC_PRIVACY_URL is not set', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: undefined,
			PUBLIC_TERMS_URL: undefined,
			PUBLIC_CONTACT_URL: undefined
		};
		const result = getFooterUrl('privacy', '/privacy', envOverride);
		expect(result).toBe('/privacy');
	});

	it('returns environment variable value when PUBLIC_TERMS_URL is set', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: undefined,
			PUBLIC_TERMS_URL: 'https://example.com/terms',
			PUBLIC_CONTACT_URL: undefined
		};
		const result = getFooterUrl('terms', '/terms', envOverride);
		expect(result).toBe('https://example.com/terms');
	});

	it('returns default value when PUBLIC_TERMS_URL is not set', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: undefined,
			PUBLIC_TERMS_URL: undefined,
			PUBLIC_CONTACT_URL: undefined
		};
		const result = getFooterUrl('terms', '/terms', envOverride);
		expect(result).toBe('/terms');
	});

	it('returns environment variable value when PUBLIC_CONTACT_URL is set', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: undefined,
			PUBLIC_TERMS_URL: undefined,
			PUBLIC_CONTACT_URL: 'https://example.com/contact'
		};
		const result = getFooterUrl('contact', '/contact', envOverride);
		expect(result).toBe('https://example.com/contact');
	});

	it('returns default value when PUBLIC_CONTACT_URL is not set', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: undefined,
			PUBLIC_TERMS_URL: undefined,
			PUBLIC_CONTACT_URL: undefined
		};
		const result = getFooterUrl('contact', '/contact', envOverride);
		expect(result).toBe('/contact');
	});

	it('supports relative URLs from environment variables', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: '/custom-privacy',
			PUBLIC_TERMS_URL: undefined,
			PUBLIC_CONTACT_URL: undefined
		};
		const result = getFooterUrl('privacy', '/privacy', envOverride);
		expect(result).toBe('/custom-privacy');
	});

	it('supports absolute URLs from environment variables', () => {
		const envOverride = {
			PUBLIC_PRIVACY_URL: undefined,
			PUBLIC_TERMS_URL: 'https://external-site.com/terms',
			PUBLIC_CONTACT_URL: undefined
		};
		const result = getFooterUrl('terms', '/terms', envOverride);
		expect(result).toBe('https://external-site.com/terms');
	});
});
