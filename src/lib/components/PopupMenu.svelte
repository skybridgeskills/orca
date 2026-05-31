<script lang="ts">
	import { createPopper, type Instance } from '@popperjs/core';
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		open: boolean;
		menuId: string;
		buttonId: string;
		baseClass?: string;
		children?: Snippet;
	}

	let {
		open,
		menuId,
		buttonId,
		baseClass = 'z-10 font-normal bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700 dark:divide-gray-600',
		children
	}: Props = $props();
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

	// Side-effect: keep popper position in sync with the menu's open state.
	// Updating a third-party lib instance in response to a prop change is a
	// genuine external side-effect, so $effect is the right tool here.
	$effect(() => {
		if (open) popperInstance?.update();
	});
</script>

<div
	id={menuId}
	class={baseClass}
	class:hidden={!open}
	role="menu"
	tabindex="0"
	onclick={(e) => e.stopPropagation()}
	onkeypress={(e) => e.stopPropagation()}
>
	{@render children?.()}
</div>
