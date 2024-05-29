import type { Achievement, AchievementConfig, AchievementCategory } from '@prisma/client';
import { get, writable } from 'svelte/store';
import { LoadingStatus } from './common';
import { notifications, Notification } from './notificationStore';

/*
// Achievements
*/
export const achievements = writable<
	(Achievement & { achievementConfig: AchievementConfig | null })[]
>([]);

// Initially unset to indicate uninitialized store, periodically needs to update.
export const achievementsLoading = writable<LoadingStatus>(LoadingStatus.NotStarted);

export const fetchAchievements = async () => {
	let a: (Achievement & { achievementConfig: AchievementConfig | null })[] = [];
	achievementsLoading.set(LoadingStatus.Loading);
	const page1 = await fetch('/api/v1/achievements?includeCount=true');
	if (page1.status !== 200) {
		achievementsLoading.set(LoadingStatus.Error);
		notifications.addNotification(new Notification('Error fetching achievements!', true, 'error'));
		return;
	}
	const { data, meta } = await page1.json();
	a = [...data];

	if (meta.totalPages > 1) {
		for (let i = 2; i <= meta.totalPages; i++) {
			const page = await fetch(`/api/v1/achievements?page=${i}`);
			if (page.status !== 200) {
				achievementsLoading.set(LoadingStatus.Error);
				notifications.addNotification(
					new Notification('Error fetching achievements!', true, 'error')
				);
				return;
			}
			const { data: pageData } = await page.json();
			a = [...a, ...pageData.data];
		}
	}

	achievements.set(a);
	achievementsLoading.set(LoadingStatus.Complete);
};

export const upsertAchievement = async (
	achievement: Achievement & { achievementConfig: AchievementConfig | null }
) => {
	achievements.set([...get(achievements).filter((a) => a.id !== achievement.id), achievement]);
};

export const deleteAchievement = async (id: string) => {
	achievements.set(get(achievements).filter((a) => a.id !== id));
};

export const getAchievementById = (id: string) => {
	return get(achievements).find((a) => a.id === id);
};
