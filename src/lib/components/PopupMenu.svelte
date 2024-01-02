<script lang="ts">
	import { createPopper, type Instance } from '@popperjs/core';
	import { onMount } from 'svelte';
	export let menuId: string;
	export let buttonId: string;
	export let hidden = false;
	export let baseClass =
		'z-10 font-normal bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 dark:divide-gray-600';
	let popperInstance: Instance | null = null;

	onMount(() => {
		const button = document.getElementById(buttonId);
		const menu = document.getElementById(menuId);
		if (!button || !menu) return;

		popperInstance = createPopper(button, menu, {
			placement: 'bottom-start',
			modifiers: [
				{
					name: 'offset',
					options: {
						offset: [0, 8]
					}
				}
			]
		});
	});
	export const handleOpen = () => {
		if (popperInstance) {
			popperInstance.update();
		}
	};
</script>

<button
	id={menuId}
	class={baseClass}
	class:hidden
	on:click|stopPropagation
	on:keypress|stopPropagation
>
	<slot />
</button>
