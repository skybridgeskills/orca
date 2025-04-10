<script lang="ts">
	interface Props {
		value?: string;
		selectedOption?: string;
		name?: string;
		label?: string;
		id?: string;
		disabled?: boolean;
		children?: import('svelte').Snippet;
	}

	let {
		value = '',
		selectedOption = $bindable(''),
		name = '',
		label = '',
		id = '',
		disabled = false,
		children
	}: Props = $props();
</script>

<div class="flex">
	<input
		bind:group={selectedOption}
		{value}
		{name}
		{id}
		{disabled}
		type="radio"
		class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
	/>
	<label
		for={id}
		class={`flex-grow ms-2 text-sm font-medium ${
			disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-300'
		}`}
	>
		{#if children}{@render children()}{:else}{label}{/if}
	</label>
</div>
