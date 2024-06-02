import { derived, writable } from 'svelte/store';
import { LoadingStatus } from './common';

export const session = writable<App.SessionData | undefined>();
export const sessionStatus = writable<LoadingStatus>(LoadingStatus.NotStarted);
export const nextPath = writable<string | undefined>(undefined);
