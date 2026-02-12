import { describe, it, expect } from 'vitest';
import { getLanguageForRequest } from '$lib/utils/language-selection';

describe('getLanguageForRequest', () => {
	const availableLanguageTags = ['en-US', 'en-AU', 'fr', 'it'] as const;

	it('returns cookie language when it exists and is valid', () => {
		const result = getLanguageForRequest('fr', undefined, availableLanguageTags);
		expect(result).toBe('fr');
	});

	it('returns cookie language when both cookie and org default exist', () => {
		const result = getLanguageForRequest('it', 'en-AU', availableLanguageTags);
		expect(result).toBe('it');
	});

	it('falls back to org default when cookie language is invalid', () => {
		const result = getLanguageForRequest('invalid', 'en-AU', availableLanguageTags);
		expect(result).toBe('en-AU');
	});

	it('falls back to org default when cookie language does not exist', () => {
		const result = getLanguageForRequest(undefined, 'fr', availableLanguageTags);
		expect(result).toBe('fr');
	});

	it('falls back to en-US when org default is invalid', () => {
		const result = getLanguageForRequest(undefined, 'invalid' as any, availableLanguageTags);
		expect(result).toBe('en-US');
	});

	it('falls back to en-US when no cookie and no org default', () => {
		const result = getLanguageForRequest(undefined, undefined, availableLanguageTags);
		expect(result).toBe('en-US');
	});

	it('falls back to en-US when cookie is invalid and org default is invalid', () => {
		const result = getLanguageForRequest('invalid', 'also-invalid' as any, availableLanguageTags);
		expect(result).toBe('en-US');
	});

	it('falls back to org default when cookie is empty string', () => {
		const result = getLanguageForRequest('', 'en-AU', availableLanguageTags);
		expect(result).toBe('en-AU');
	});
});
