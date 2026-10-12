<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		text?: string;
		for?: string;
		disabled?: boolean;
		children?: Snippet;
	}

	let { text = '', for: inputId = '', disabled = false, children }: Props = $props();

	const tColor = 'text-gray-900 dark:text-gray-300'; // Default text color
	const dtColor = 'text-gray-400 dark:text-gray-600'; // Disabled text color
</script>

<label for={inputId} class={`block mb-2 text-sm font-medium ${disabled ? dtColor : tColor}`}>
	{#if children}{@render children()}{:else}{text}{/if}
</label>
