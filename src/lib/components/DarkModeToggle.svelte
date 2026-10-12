<script lang="ts">
	import { Icon } from 'svelte-icons-pack';
	import { WiWiNightClear as WiNightClear } from 'svelte-icons-pack/wi';
	import { WiWiHorizonAlt as WiHorizonAlt } from 'svelte-icons-pack/wi';

	import * as m from '$lib/i18n/messages';

	import { preferredTheme } from '../stores/interfacePrefsStore';

	interface Props {
		onclick?: (event: MouseEvent) => void;
		onkeypress?: (event: KeyboardEvent) => void;
	}

	let { onclick, onkeypress }: Props = $props();

	const handleClick = (event: MouseEvent) => {
		preferredTheme.toggleDarkMode();
		onclick?.(event);
	};
</script>

<button
	id="darkmode-toggle"
	type="button"
	class="ml-2 y-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-hidden focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 rounded-lg text-sm"
	onclick={handleClick}
	{onkeypress}
>
	{#if $preferredTheme == 'light'}
		<div class="icon text-gray-500"><Icon src={WiHorizonAlt} size="32" color="currentColor" /></div>
	{:else}
		<div class="icon text-gray-500"><Icon src={WiNightClear} size="32" color="currentColor" /></div>
	{/if}
	<span class="sr-only">{m.swift_steady_falcon_themedesc()}</span>
</button>

<style>
	.icon {
		width: 32px;
		height: 32px;
	}
</style>
