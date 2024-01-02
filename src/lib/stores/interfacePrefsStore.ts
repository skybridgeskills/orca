import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { updateCookie } from '$lib/utils/themeUtils';

const getInitialDarkModePref = (initialValue: string): string => {
	const userBrowserPrefersDark =
		browser && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	const userBrowserPrefersLight =
		browser && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

	const previouslyStoredSetting = browser
		? window.localStorage.getItem('preferredTheme') || initialValue
		: initialValue;

	if (previouslyStoredSetting && previouslyStoredSetting != 'default')
		return previouslyStoredSetting;

	if (previouslyStoredSetting == 'default' && userBrowserPrefersDark) return 'dark';

	return 'light';
};

const preferredThemeStore = () => {
	const { subscribe, set, update } = writable(getInitialDarkModePref('default'));

	return {
		subscribe,
		toggleDarkMode: () => {
			const oldValue = get(preferredTheme);
			const newValue = oldValue == 'light' ? 'dark' : 'light';
			console.log(`Setting Theme Preference: ${newValue}`);

			window.localStorage.setItem('preferredTheme', newValue);

			updateCookie(newValue);
			update((n) => newValue);
		},

		initialize: (initialValue: string) => {
			const preferredTheme = getInitialDarkModePref(initialValue);
			updateCookie(preferredTheme);
			set(preferredTheme);
		}
	};
};

export const preferredTheme = preferredThemeStore();
