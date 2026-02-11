<script lang="ts">
	import MarkdownRender from '$lib/components/MarkdownRender.svelte';
	import * as m from '$lib/i18n/messages';
	import type { Achievement, AchievementClaim, AchievementCredential } from '@prisma/client';
	export let claim: AchievementClaim | null;

	const claimData = JSON.parse(claim?.json?.toString() || '{}') || {};
</script>

{#if claimData.narrative}
	<p class="my-2 text-gray-500 dark:text-gray-400">
		<span class="font-bold">{m.narrative()}</span>: <MarkdownRender value={claimData.narrative} />
	</p>
{/if}
{#if claimData.id}
	<p class="my-2 text-gray-500 dark:text-gray-400">
		<span class="font-bold">{m.calm_steady_lynx_evidence()}</span>:
		<a
			href={claimData.id}
			target="_{claim?.achievementId || 'blank'}"
			class="underline hoder:no-underline"
		>
			{claimData.id}
		</a>
	</p>
{/if}
