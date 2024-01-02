<script lang="ts">
	const textSizes = {
		h1: 'text-2xl sm:text-3xl font-extrabold',
		h2: 'text-2xl sm:text-3xl font-bold',
		h3: 'text-xl sm:text-1xl font-bold'
	};
	export let title = '';
	export let description = '';
	export let level: 'h1' | 'h2' | 'h3' = 'h1';
</script>

<svelte:element this={level} class="{textSizes[level]} dark:text-white mb-2">
	{title}
</svelte:element>

{#if description || $$slots}
	<p class="mb-6 text-sm text-gray-500 dark:text-gray-400 max-w-prose">
		{description}
		<slot />
	</p>
{/if}
