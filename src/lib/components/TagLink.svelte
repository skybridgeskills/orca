<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<span
	class="whitespace-nowrap rounded-lg bg-slate-100 py-0.5 px-2 text-xs font-semibold leading-6 text-slate-700 hover:text-blue-700"
>
	{@render children?.()}
</span>
