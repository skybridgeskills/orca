<script lang="ts">
	import { onMount } from 'svelte';

	import { locales, getLocale, baseLocale } from '$lib/i18n/runtime';

	import PopupMenu from './PopupMenu.svelte';

	type AvailableLanguageTag = (typeof locales)[number];

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	let currentLang: AvailableLanguageTag = $state(getLocale() ?? baseLocale);
	const toggleLanguageSelector = (e: Event | KeyboardEvent) => {
		e.stopPropagation();
		e.preventDefault();

		// Some browsers call both the keypress and click events if the user presses spacebar
		// If that's the case, we'll let this function handle it on the click event only.
		if (!(e instanceof KeyboardEvent) || e.key != ' ') open = !open;
	};

	onMount(() => {
		currentLang = getLocale() ?? baseLocale;
	});

	const setLocale = (langTag: string) => {
		document.cookie = `locale=${langTag}; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
		window.location.reload();
	};
</script>

<div
	id="language-selector-button"
	class="ml-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-hidden focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 rounded-lg text-sm"
	onclick={toggleLanguageSelector}
	onkeypress={toggleLanguageSelector}
	role="button"
	tabindex="0"
>
	<div class="text-sm text-gray-700 dark:text-gray-400 h-8 p-2">
		{getLocale() ?? 'en-US'}
	</div>
	<PopupMenu menuId="language-selector-menu" buttonId="language-selector-button" {open}>
		{#if open}
			<ul
				class="list-none m-0 p-0 py-2 text-sm text-gray-700 dark:text-gray-400"
				aria-labelledby="language-selector-button"
			>
				{#each locales as langTag (langTag)}
					{#if langTag == currentLang}
						<li>
							<button class="block px-4 py-2">{langTag}</button>
						</li>
					{:else}
						<li>
							<button
								class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
								onclick={() => {
									setLocale(langTag);
									open = false;
								}}>{langTag}</button
							>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</PopupMenu>
</div>
