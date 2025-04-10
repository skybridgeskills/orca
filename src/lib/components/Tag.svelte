<script lang="ts">
	
	interface Props {
		class?: string;
		open?: boolean;
		trigger?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
	}

	let {
		class: klass = 'bg-slate-100 text-slate-700',
		open = $bindable(true),
		trigger,
		children
	}: Props = $props();
</script>

<span class={`whitespace-nowrap rounded-lg py-0.5 px-2 text-xs font-semibold leading-6 ${klass}`}>
	<button onclick={() => (open = !open)}> {@render trigger?.()}</button>
	{#if open}
		{@render children?.()}
	{/if}
</span>
