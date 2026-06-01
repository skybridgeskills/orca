<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { PageProps } from './$types';
	import AchievementCriteria from '$lib/partials/achievement/AchievementCriteria.svelte';
	import { imageUrl } from '$lib/utils/imageUrl';

	let { data }: PageProps = $props();
	let achievement = data.credential.achievement;

	let breadcrumbItems = [
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: achievement.name, href: `/achievements/${achievement.id}` }
	];
</script>

<Breadcrumbs items={breadcrumbItems} />

{#if achievement.image}
	<img src={imageUrl(achievement.image)} alt="Badge graphic for {achievement.name}" />
	<p class="max-w-2xl mt-1 text-sm text-gray-500 dark:text-gray-400">{achievement.description}</p>
{:else}
	<p class="max-w-2xl mt-1 text-sm text-gray-500 dark:text-gray-400">{achievement.description}</p>
{/if}

<div class="mt-4 max-w-2xl">
	<AchievementCriteria {achievement} />
</div>
