<script lang="ts">
	import type { AchievementClaim } from '@prisma/client';

	import MarkdownRender from '$lib/components/MarkdownRender.svelte';
	import * as m from '$lib/i18n/messages';

	interface Props {
		claim: AchievementClaim | null;
	}

	let { claim }: Props = $props();

	const claimData = $derived(JSON.parse(claim?.json?.toString() || '{}') || {});
</script>

{#if claimData.narrative}
	<div class="my-2 text-gray-500 dark:text-gray-400">
		<span class="font-bold">{m.fancy_flat_kite_relish()}</span>: <MarkdownRender
			value={claimData.narrative}
		/>
	</div>
{/if}
{#if claimData.id}
	<p class="my-2 text-gray-500 dark:text-gray-400">
		<span class="font-bold">{m.calm_steady_lynx_evidence()}</span>:
		<a
			href={claimData.id}
			rel="external"
			target="_{claim?.achievementId || 'blank'}"
			class="underline hoder:no-underline"
		>
			{claimData.id}
		</a>
	</p>
{/if}
