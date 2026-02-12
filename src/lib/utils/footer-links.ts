import { env as dynamicEnv } from '$env/dynamic/public';

type FooterLinkKey = 'privacy' | 'terms' | 'contact';

interface FooterEnv {
	PUBLIC_PRIVACY_URL?: string;
	PUBLIC_TERMS_URL?: string;
	PUBLIC_CONTACT_URL?: string;
}

/**
 * Gets the URL for a footer link from environment variables with fallback to default.
 *
 * @param key - The type of footer link ('privacy', 'terms', or 'contact')
 * @param defaultValue - The default URL to use if environment variable is not set
 * @param envOverride - Optional environment override for testing
 * @returns The URL from environment variable if set, otherwise the default value
 */
export function getFooterUrl(
	key: FooterLinkKey,
	defaultValue: string,
	envOverride?: FooterEnv
): string {
	const envSource: FooterEnv = envOverride ?? {
		PUBLIC_PRIVACY_URL: dynamicEnv.PUBLIC_PRIVACY_URL,
		PUBLIC_TERMS_URL: dynamicEnv.PUBLIC_TERMS_URL,
		PUBLIC_CONTACT_URL: dynamicEnv.PUBLIC_CONTACT_URL
	};
	const envVarMap: Record<FooterLinkKey, string | undefined> = {
		privacy: envSource.PUBLIC_PRIVACY_URL,
		terms: envSource.PUBLIC_TERMS_URL,
		contact: envSource.PUBLIC_CONTACT_URL
	};

	const envValue = envVarMap[key];
	return envValue ?? defaultValue;
}
