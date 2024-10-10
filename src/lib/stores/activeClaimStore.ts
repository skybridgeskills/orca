import { writable, get } from 'svelte/store';

// TODO reset the claim data if the user goes to a claim form for a different badge after filling out some of the form.
export const claimId = writable(''); // Which Badge ID (uuid) is being claimed?
export const inviteId = writable(''); // Is there an inviteId that qualifies an unauthenticated user to make a claim?
export const claimEmail = writable('');
export const claimNarrative = writable('');
export const claimUrl = writable('');
export const claimPending = writable(false);
export const inviteCreatedAt = writable<Date>(undefined);
