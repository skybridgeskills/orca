import { getContext, setContext } from 'svelte';
import { type Readable, type Writable, writable } from 'svelte/store';

const SESSION_KEY = Symbol('session');

/**
 * Provide the per-request session as a context-scoped store. Called once in the
 * root layout, seeded from `data.session`. Using context (not a module-level
 * store) keeps the session per request, so it is SSR-correct and cannot leak
 * between requests on the server.
 */
export function setSessionContext(
	initial: App.SessionData | undefined
): Writable<App.SessionData | undefined> {
	const store = writable<App.SessionData | undefined>(initial);
	setContext(SESSION_KEY, store);
	return store;
}

/** Read the current session store. Must be called within the layout's context. */
export function getSession(): Readable<App.SessionData | undefined> {
	const store = getContext<Writable<App.SessionData | undefined>>(SESSION_KEY);
	if (!store) {
		throw new Error('getSession() called outside of a session context provider');
	}
	return store;
}
