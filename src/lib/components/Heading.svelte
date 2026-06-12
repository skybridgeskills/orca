<script lang="ts">
	interface Props {
		title?: string;
		description?: string;
		level?: 'h1' | 'h2' | 'h3';
		children?: import('svelte').Snippet;
	}

	let { title = '', description = '', level = 'h1', children }: Props = $props();

	const textSizes = {
		h1: 'text-2xl sm:text-3xl font-extrabold',
		h2: 'text-2xl sm:text-3xl font-bold',
		h3: 'text-xl sm:text-1xl font-bold'
	};
</script>

<svelte:element this={level} class="{textSizes[level]} dark:text-white mb-2">
	{title}
</svelte:element>

{#if description || children}
	<div class="mb-6 text-sm text-gray-500 dark:text-gray-400 max-w-prose">
		{#if description}
			<p>{description}</p>
		{/if}
		{@render children?.()}
	</div>
{/if}
