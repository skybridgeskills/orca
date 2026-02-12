import { baseLocale, type locales } from '$lib/i18n/runtime';

type AvailableLanguageTag = (typeof locales)[number];

/**
 * Determines which language to use for a request based on cookie value,
 * organization default language, and available language tags.
 *
 * Priority order:
 * 1. Cookie language (if exists and valid)
 * 2. Organization default language (if exists and valid)
 * 3. Fallback to 'en-US'
 *
 * @param cookieLanguage - The language from the cookie, if any
 * @param orgDefaultLanguage - The organization's default language, if any
 * @param availableLanguageTags - Array of available language tags
 * @returns A valid language tag
 */
export function getLanguageForRequest(
	cookieLanguage: string | undefined,
	orgDefaultLanguage: AvailableLanguageTag | undefined,
	availableLanguageTags: readonly AvailableLanguageTag[]
): AvailableLanguageTag {
	// 1. If cookie language exists and is valid, use it
	if (cookieLanguage && availableLanguageTags.includes(cookieLanguage as AvailableLanguageTag)) {
		return cookieLanguage as AvailableLanguageTag;
	}

	// 2. If org default language exists and is valid, use it
	if (
		orgDefaultLanguage &&
		availableLanguageTags.includes(orgDefaultLanguage as AvailableLanguageTag)
	) {
		return orgDefaultLanguage;
	}

	// 3. Fallback to 'en-US'
	return baseLocale;
}
