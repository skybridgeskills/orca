<script lang="ts">
	import * as m from '$lib/i18n/messages';

	interface Props {
		maxWidth?: string;
		hoverEffect?: boolean;
		href?: string;
		children?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	}

	let {
		maxWidth = 'max-w-md',
		hoverEffect = false,
		href = '',
		children,
		actions
	}: Props = $props();
</script>

<svelte:element
	this={href ? 'a' : 'li'}
	href={href || undefined}
	class="p-4 {maxWidth} {hoverEffect
		? 'hover:shadow-xl hover:border-gray-300'
		: ''} bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex flex-col"
>
	<div class="w-full h-full">
		{#if children}{@render children()}{:else}
			<h3 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
				{m.swift_steady_falcon_missing()}
			</h3>
		{/if}
	</div>

	{#if actions}
		<div class="w-full inline-flex items-center pt-3">
			{@render actions()}
		</div>
	{/if}
</svelte:element>
