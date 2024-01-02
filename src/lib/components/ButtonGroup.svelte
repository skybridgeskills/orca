<script lang="ts">
	interface ButtonConfig {
		text: string;
		onClick: Function;
		props: object;
	}

	export let buttons: Array<ButtonConfig>;
</script>

<div class="inline-flex rounded-md shadow-sm button-group" role="group">
	{#each buttons as button}
		<button
			{...button.props}
			on:click={() => button.onClick()}
			class="py-2 px-4 text-sm font-medium text-gray-900 bg-white border-l border-t border-b border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
		>
			{button.text}
		</button>
	{/each}
</div>

<style lang="postcss">
	.button-group > :first-child {
		@apply rounded-l-lg;
	}
	.button-group > :last-child {
		@apply rounded-r-lg border-r;
	}
</style>
