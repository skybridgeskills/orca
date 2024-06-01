import * as m from '$lib/i18n/messages';
import type { AchievementClaim, ClaimEndorsement } from '@prisma/client';
import { get, writable } from 'svelte/store';
import { LoadingStatus } from './common';
import { notifications, Notification } from './notificationStore';
import { session } from './sessionStore';

/*
// AchievementClaims in the current User's backpack
*/

export const backpackClaims = writable<AchievementClaim[]>([]);

export const backpackClaimsLoading = writable<LoadingStatus>(LoadingStatus.NotStarted);

export const fetchBackpackClaims = async (): Promise<LoadingStatus> => {
	if (!get(session)?.user) return LoadingStatus.NotStarted;

	let a: AchievementClaim[] = [];
	backpackClaimsLoading.set(LoadingStatus.Loading);
	const page1 = await fetch('/api/v1/backpack/claims?includeCount=true');
	if (page1.status !== 200) {
		notifications.addNotification(new Notification(m.backpack_errorFetchingData(), true, 'error'));
		return LoadingStatus.Error;
	}
	const { data, meta } = await page1.json();
	a = [...data];

	if (meta.totalPages > 1) {
		for (let i = 2; i <= meta.totalPages; i++) {
			const page = await fetch(`/api/v1/achievements?page=${i}`);
			if (page.status !== 200) {
				notifications.addNotification(
					new Notification(m.backpack_errorFetchingData(), true, 'error')
				);
				return LoadingStatus.Error;
			}
			const { data: pageData } = await page.json();
			a = [...a, ...pageData.data];
		}
	}

	backpackClaims.set(a);
	return LoadingStatus.Complete;
};

export const upsertBackpackClaim = async (claim: AchievementClaim) => {
	const existing = getClaimById(claim.id);
	backpackClaims.set([...get(backpackClaims).filter((c) => c.id !== claim.id), claim]);
};

export const deleteAchievementCategory = async (id: string) => {
	backpackClaims.set(get(backpackClaims).filter((c) => c.id !== id));
};

export const getClaimById = (id: string) => {
	return get(backpackClaims).find((c) => c.id === id);
};

/* Outstanding invites for the current User */
export const outstandingInvites = writable<ClaimEndorsement[]>([]);
export const outstandingInvitesLoading = writable<LoadingStatus>(LoadingStatus.NotStarted);

export const fetchOutstandingInvites = async (): Promise<LoadingStatus> => {
	const res = await fetch('/api/v1/backpack/invites');
	if (res.status !== 200) {
		notifications.addNotification(
			new Notification('Error fetching outstanding invites!', true, 'error')
		);
		return LoadingStatus.Error;
	}
	const { data }: { data: ClaimEndorsement[] } = await res.json();
	outstandingInvites.set(data);
	return LoadingStatus.Complete;
};
