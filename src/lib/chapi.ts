import type { Polyfill } from 'credential-handler-polyfill';

import { browser } from '$app/environment';

export const CHAPI_MEDIATOR_ORIGIN = 'https://authn.io';

let loading: Promise<Polyfill> | undefined;

/**
 * Loads the CHAPI polyfill once, without patching `navigator.credentials`.
 * `loadOnce()` is not used: it returns `true` (not the polyfill) on later calls,
 * and with an options object `mediatorOrigin` is required.
 */
export function getChapi(): Promise<Polyfill> {
	if (!browser) return Promise.reject(new Error('CHAPI is only available in the browser.'));
	loading ??= import('credential-handler-polyfill')
		.then(({ load }) => load({ setGlobal: false, mediatorOrigin: CHAPI_MEDIATOR_ORIGIN }))
		.catch((e) => {
			// Allow a retry after a failed load (e.g. the mediator iframe timed out).
			loading = undefined;
			throw e;
		});
	return loading;
}
