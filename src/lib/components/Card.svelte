<script lang="ts">
	import * as m from '$lib/i18n/messages';
	export let maxWidth = 'max-w-md';
	export let hoverEffect = false;
	export let href = '';
</script>

<svelte:element
	this={!!href ? 'a' : 'li'}
	href={href || undefined}
	class="p-4 {maxWidth} {hoverEffect
		? 'hover:shadow-xl hover:border-gray-300'
		: ''} bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex flex-col"
>
	<div class="w-full h-full">
		<slot>
			<h3 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
				{m.contentMissing()}
			</h3>
		</slot>
	</div>

	<div class="w-full inline-flex items-center pt-3">
		<slot name="actions" />
	</div>
</svelte:element>
