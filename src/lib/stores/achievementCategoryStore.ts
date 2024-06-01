import type { AchievementCategory } from '@prisma/client';
import { get, writable } from 'svelte/store';
import { LoadingStatus } from './common';
import { notifications, Notification } from './notificationStore';

/*
// Achievement Categories
*/
interface AchievementCategoryWithCount extends AchievementCategory {
	_count?: { achievements: number };
}
export const achievementCategories = writable<AchievementCategoryWithCount[]>([]);

export const acLoading = writable<LoadingStatus>(LoadingStatus.NotStarted);

export const fetchAchievementCategories = async (): Promise<LoadingStatus> => {
	const res = await fetch('/api/v1/achievementCategories');
	if (res.status !== 200) {
		notifications.addNotification(new Notification('Error fetching categories!', true, 'error'));
		return LoadingStatus.Error;
	}
	const { data }: { data: AchievementCategoryWithCount[] } = await res.json();
	achievementCategories.set(data.sort((a, b) => b.weight - a.weight));

	return LoadingStatus.Complete;
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
