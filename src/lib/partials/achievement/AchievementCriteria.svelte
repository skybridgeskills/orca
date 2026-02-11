<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { Achievement } from '@prisma/client';
	import MarkdownRender from '$lib/components/MarkdownRender.svelte';

	export let achievement: Achievement;
</script>

<h3 class="text-l sm:text-xl mt-4 mb-3 dark:text-gray-100">{m.lower_piquant_lemur_grin()}</h3>

{#if achievement.criteriaId}
	<p class="max-w-2xl mt-1 text-sm text-gray-500 dark:text-gray-400">
		<a
			href={achievement.criteriaId}
			class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
			target={`achievement-criteria-${achievement.id}}`}>{achievement.criteriaId}</a
		>
	</p>
{/if}

{#if achievement.criteriaNarrative}
	<p class="max-w-2xl mt-1 text-sm text-gray-500 dark:text-gray-400">
		<MarkdownRender value={achievement.criteriaNarrative} />
	</p>
{/if}
