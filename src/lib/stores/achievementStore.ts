import type { Achievement, AchievementConfig, AchievementCategory } from '@prisma/client';
import { get, writable } from 'svelte/store';
import { LoadingStatus } from './common';

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
		console.log('Error fetching achievements!'); // TODO: Add error handling
		return;
	}
	const { data, meta } = await page1.json();
	a = [...data];

	if (meta.totalPages > 1) {
		for (let i = 2; i <= meta.totalPages; i++) {
			const page = await fetch(`/api/v1/achievements?page=${i}`);
			if (page.status !== 200) {
				achievementsLoading.set(LoadingStatus.Error);
				console.log('Error fetching achievements!'); // TODO: Add error handling
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

/*
// Achievement Categories
*/
interface AchievementCategoryWithCount extends AchievementCategory {
	_count?: { achievements: number };
}
export const achievementCategories = writable<AchievementCategoryWithCount[]>([]);

export const acLoading = writable<LoadingStatus>(LoadingStatus.NotStarted);

export const fetchAchievementCategories = async () => {
	acLoading.set(LoadingStatus.Loading);
	const res = await fetch('/api/v1/achievementCategories');
	if (res.status !== 200) {
		achievementsLoading.set(LoadingStatus.Error);
		console.log('Error fetching categories!'); // TODO: Add error handling
		return;
	}
	const { data }: { data: AchievementCategoryWithCount[] } = await res.json();
	achievementCategories.set(data.sort((a, b) => b.weight - a.weight));

	acLoading.set(LoadingStatus.Complete);
};

export const upsertAchievementCategory = async (category: AchievementCategoryWithCount) => {
	const existing = getCategoryById(category.id);
	achievementCategories.set(
		[
			...get(achievementCategories).filter((c) => c.id !== category.id),
			{
				...category,
				_count: category._count ?? existing?._count
			}
		].sort((a, b) => b.weight - a.weight)
	);
};

export const deleteAchievementCategory = async (id: string) => {
	achievementCategories.set(get(achievementCategories).filter((c) => c.id !== id));
};

export const getCategoryById = (id: string) => {
	return get(achievementCategories).find((c) => c.id === id);
};
