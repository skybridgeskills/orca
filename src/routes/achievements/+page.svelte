<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Ribbon from '$lib/illustrations/Ribbon.svelte';
	import RightArrow from '$lib/illustrations/RightArrow.svelte';
	import Card from '$lib/components/Card.svelte';
	import type { AchievementCategory, Achievement } from '@prisma/client';
	import { session } from '$lib/stores/sessionStore';
	import Heading from '$lib/components/Heading.svelte';
	import { imageUrl } from '$lib/utils/imageUrl';

	export let data: PageData;
	const achievements = data.achievements;
	const categories = [
		...data.categories,
		{
			id: 'uncategorized',
			organizationId: data.org.id,
			name: 'Uncategorized',
			weight: -1
		}
	];

	const categoryAchievements: { [key: string]: Array<Achievement> } = {};

	categories.map(
		(category: AchievementCategory) =>
			(categoryAchievements[category.id] = achievements.filter(
				(a: Achievement) =>
					a.categoryId == category.id || (!a.categoryId && category.id == 'uncategorized')
			))
	);
</script>

<Heading title={m.achievement_other()} description={m.achievements_description()} />

{#if $session?.user?.orgRole}
	<div class="flex items-center mb-9">
		<Button href="/achievements/create" text={m.createNewCTA()} />
		<Button href="/achievements/categories" text={m.categories_editCTA()} submodule="secondary" />
	</div>
{/if}

{#each categories as category}
	{#if categoryAchievements[category.id].length}
		<h2 class="text-l sm:text-xl font-bold mt-6 mb-4 dark:text-white">{category.name}</h2>
		<div class="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-4">
			{#each categoryAchievements[category.id] as achievement}
				<Card maxWidth="" hoverEffect={true} href="/achievements/{achievement.id}">
					<div class="grid grid-cols-4 gap-2">
						<div class="m-auto">
							{#if achievement.image}
								<img
									src={imageUrl(achievement.image)}
									class=""
									alt={m.achievementImageAltText({ name: achievement.name })}
								/>
							{:else}
								<div class="text-gray-400 dark:text-gray-700">
									<Ribbon />
								</div>
							{/if}
						</div>

						<div class="col-span-3">
							<h3 class="mb-2 text-base font-bold tracking-tight text-gray-900 dark:text-white">
								{achievement.name}
							</h3>

							<p class="mb-3 text-xs font-normal text-gray-700 dark:text-gray-400">
								{achievement.description}
							</p>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
{/each}
