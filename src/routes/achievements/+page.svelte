<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import Ribbon from '$lib/illustrations/Ribbon.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		achievements,
		achievementsLoading,
		fetchAchievements
	} from '$lib/stores/achievementStore';
	import {
		achievementCategories,
		acLoading,
		fetchAchievementCategories
	} from '$lib/stores/achievementCategoryStore';
	import type { AchievementCategory, Achievement, AchievementConfig } from '@prisma/client';
	import { session } from '$lib/stores/sessionStore';
	import Heading from '$lib/components/Heading.svelte';
	import { imageUrl } from '$lib/utils/imageUrl';
	import { onMount, tick } from 'svelte';
	import { ensureLoaded, LoadingStatus } from '$lib/stores/common';
	import Alert from '$lib/components/Alert.svelte';
	import EmptyStateZone from '$lib/components/EmptyStateZone.svelte';

	export let data: PageData;
	const U = {
		id: 'uncategorized',
		organizationId: data.org.id,
		name: m.light_early_owl_shrine(),
		weight: -1
	};

	const categoryAchievements: {
		[key: string]: Array<Achievement & { achievementConfig: AchievementConfig | null }>;
	} = {};
	const mapCategories = () => {
		[...$achievementCategories, U].map(
			(c: AchievementCategory) =>
				(categoryAchievements[c.id] = $achievements.filter(
					(a: Achievement) => a.categoryId == c.id || (!a.categoryId && c.id == 'uncategorized')
				))
		);
	};

	onMount(async () => {
		await Promise.all([
			ensureLoaded(achievementsLoading, fetchAchievements),
			ensureLoaded(acLoading, fetchAchievementCategories)
		]);
		mapCategories();
	});
</script>

<Heading title={m.antsy_grand_rabbit_gaze()} description={m.quick_happy_fox_fry()} />

<div class="flex items-center mb-9">
	{#if data.editAchievementCapability}
		<Button href="/achievements/create" text={m.fresh_bright_sparrow_create()} />
	{/if}
	{#if data.editCategoriesCapability}
		<Button href="/achievements/categories" text={m.tired_elegant_jackdaw_jump()} submodule="secondary" />
	{/if}
</div>

{#if $achievementsLoading == LoadingStatus.NotStarted || $achievementsLoading == LoadingStatus.Loading}
	<LoadingSpinner />
{/if}
{#if $achievementsLoading == LoadingStatus.Error}
	<Alert level="warning" message={m.petty_wet_marten_zoom()} />
{/if}
{#if $achievementsLoading == LoadingStatus.Complete && !$achievements?.length}
	<EmptyStateZone
		title={m.tidy_sunny_seahorse_relish()}
		description={m.flat_sleek_mole_ascend()}
	/>
{/if}
{#each [...$achievementCategories, U] as category (category.id)}
	{#if categoryAchievements[category.id]?.length}
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
									alt={m.firm_steady_boar_imagealt({ name: achievement.name })}
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
