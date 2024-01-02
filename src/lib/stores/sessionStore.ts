import { writable } from 'svelte/store';

export const session = writable<App.SessionData | undefined>();
export const nextPath = writable<string | undefined>(undefined);
