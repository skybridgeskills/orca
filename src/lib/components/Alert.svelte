<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { createEventDispatcher } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	export let level: 'info' | 'warning' | 'success' | 'error' = 'info';
	export let message: string = '';
	export let heading: string = '';
	export let dismissable: boolean = false;
	export let elementId: string = uuidv4();
	const dispatch = createEventDispatcher();
</script>

{#if dismissable}
	<div class="max-w-2xl flex items-center p-4 mb-4 rounded-lg {level}" role="alert" id={elementId}>
		<div class="ml-3 text-sm font-medium">
			{message}
			<slot />
		</div>
		<button
			type="button"
			class="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-blue-400 p-1.5 hover:bg-blue-200 inline-flex items-center justify-center h-8 w-8 dark:hover:bg-gray-700 {level}"
			data-dismiss-target={elementId}
			aria-label={m.close()}
			on:click={() => {
				dispatch('close');
			}}
		>
			<span class="sr-only">{m.close()}</span>
			<svg
				class="w-3 h-3"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 14 14"
			>
				<path
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
				/>
			</svg>
		</button>
	</div>
{:else}
	<div class="max-w-2xl p-4 my-4 text-sm rounded-lg {level}" role="alert">
		{#if heading}<span class="font-medium">{heading}</span>{/if}
		{message}
		<slot />
	</div>
{/if}

<style lang="postcss">
	.info {
		@apply text-blue-700 bg-blue-100;
	}
	.dark .info {
		@apply bg-blue-200 text-blue-800;
	}

	.warning {
		@apply text-yellow-700 bg-yellow-100;
	}
	.dark .warning {
		@apply bg-yellow-200 text-yellow-800;
	}

	.success {
		@apply text-green-700 bg-green-100;
	}
	.dark .success {
		@apply bg-green-200 text-green-800;
	}

	.error {
		@apply text-red-700 bg-red-100;
	}
	.dark .error {
		@apply bg-red-200 text-red-800;
	}
</style>
