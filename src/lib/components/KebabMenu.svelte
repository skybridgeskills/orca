<script lang="ts">
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { FaSolidEllipsis } from 'svelte-icons-pack/fa';

	import IconButton from './IconButton.svelte';
	import PopupMenu from './PopupMenu.svelte';

	import { browser } from '$app/environment';

	interface Props {
		/** Unique id base so multiple kebab menus can coexist on one page. */
		id: string;
		/** Accessible label for the "…" trigger button. */
		label: string;
		/** Menu rows (e.g. <button>/<a> items). Rendered inside the popup. */
		children?: Snippet;
	}

	let { id, label, children }: Props = $props();

	const buttonId = $derived(`${id}-button`);
	const menuId = $derived(`${id}-menu`);

	let open = $state(false);

	const toggle = (e: Event) => {
		e.stopPropagation();
		e.preventDefault();
		open = !open;
	};
	const close = () => {
		open = false;
	};

	// Close on any outside click (the PopupMenu stops propagation for clicks
	// inside it, so this only fires for clicks elsewhere on the page).
	onMount(() => {
		if (browser) document.addEventListener('click', close);
	});
	onDestroy(() => {
		if (browser) document?.removeEventListener('click', close);
	});
</script>

<div class="relative inline-flex">
	<IconButton id={buttonId} src={FaSolidEllipsis} size="20" text={label} onclick={toggle} />

	<PopupMenu {menuId} {buttonId} {open}>
		<ul class="py-2 text-sm text-gray-700 dark:text-gray-400" aria-labelledby={buttonId}>
			{@render children?.()}
		</ul>
	</PopupMenu>
</div>
