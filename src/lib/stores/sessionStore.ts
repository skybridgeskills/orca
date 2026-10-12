import { writable } from 'svelte/store';

// Post-login redirect target, preserved across the unauthenticated → authenticated
// transition. The session itself is provided per request via `$lib/session/context`.
export const nextPath = writable<string | undefined>(undefined);
