<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import MarkdownRender from '$lib/components/MarkdownRender.svelte';

	interface Props {
		item: App.EvidenceItem;
	}

	let { item }: Props = $props();
</script>

<div>
	{#if item.narrative}
		<blockquote class="markdown-preview max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			<span class="font-bold">{m.narrative()}:</span>
			{#if item.narrative}
				<MarkdownRender value={item.narrative} />
			{/if}
		</blockquote>
	{/if}
	{#if item.id}<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
			<a href={item.id} class="underline hover:no-underline">{item.id}</a>
		</p>{/if}
</div>
