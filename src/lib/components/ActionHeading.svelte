<script lang="ts">
	interface Props {
		text?: string;
		heading?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	}

	let { text = '', heading, actions }: Props = $props();
</script>

<div class="w-full flex justify-between items-center mb-4">
	{#if heading}{@render heading()}{:else}<h3 class="inline-flex mt-1 mr-3 text-xl sm:text-2xl text-gray-800 dark:text-white">
			{text}
		</h3>{/if}
	<div class="inline-flex items-center">
		{@render actions?.()}
	</div>
</div>
