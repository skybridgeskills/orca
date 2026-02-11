<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { PageData } from './$types';
	import Card from '$lib/components/Card.svelte';
	import Ribbon from '$lib/illustrations/Ribbon.svelte';
	import RightArrow from '$lib/illustrations/RightArrow.svelte';
	import EmptyStateZone from '$lib/components/EmptyStateZone.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import { imageUrl } from '$lib/utils/imageUrl';

	export let data: PageData;
</script>

<Heading title={data.org.name} description={data.org.description} />

{#if data.highlightedAchievements.length}
	<h2 class="text-xl sm:text-2xl mb-3 dark:text-white">{m.swift_steady_falcon_mostawarded()}</h2>

	<ul class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
		{#each data.highlightedAchievements as achievement}
			<Card maxWidth="">
				<div class="mb-4 max-w-xs">
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

				<a href="/achievements/{achievement.id}">
					<h3 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
						{achievement.name}
					</h3>
				</a>
				<p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
					{m.achievement_awardCountSummary({ count: achievement._count.achievementClaims })}
				</p>

				<div slot="actions">
					<a
						href="/achievements/{achievement.id}"
						class="align-bottom inline-flex items-center py-2 px-3 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
					>
						{m.view()}
						<RightArrow />
					</a>
				</div>
			</Card>
		{/each}
	</ul>
	<p class="my-4 text-sm text-gray-500 dark:text-gray-400 text-center">
		{m.bright_swift_eagle_see()}
		<a href="/achievements" class="underline hover:no-underline">{m.achievements_all()}</a>.
	</p>
{:else}
	<EmptyStateZone title={m.award_noneYet()}>
		<Ribbon slot="image" />
		<p slot="description">
			{m.bright_swift_eagle_see()}
			<a href="/achievements" class="underline hover:no-underline">{m.achievements_all()}</a>.
		</p>
	</EmptyStateZone>
{/if}
