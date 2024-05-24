<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { MetaTags } from 'svelte-meta-tags';

	import { page } from '$app/stores';
	import { preferredTheme } from '$lib/stores/interfacePrefsStore';
	import {
		achievements,
		achievementsLoading,
		fetchAchievements
	} from '$lib/stores/achievementStore';
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/sessionStore';
	import { notifications } from '$lib/stores/notificationStore';
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import type { PageData } from './$types';
	import { languageTag, setLanguageTag } from '$lib/i18n/runtime';

	export let data: PageData;
	preferredTheme.initialize(data.cookieTheme || 'light');
	setLanguageTag(data.locale);

	onMount(() => {
		preferredTheme.initialize(data.cookieTheme || 'light'); // reinitialize but with the ability to set document.cookie
		if (data.session) $session = data.session;
	});
</script>

<MetaTags title={data.org.name} titleTemplate="%s | ORCA Pod" description={data.org.description} />

<div
	id="app-wrapper"
	class="app-wrapper"
	class:dark={$preferredTheme == 'dark'}
	class:light={$preferredTheme == 'light'}
>
	<section class="fixed top-10 w-full">
		<div class="max-w-2xl mx-auto">
			<!-- Notifications, if there are any -->
			{#each $notifications as n (n.id)}
				<Alert
					message={n.message}
					dismissable={true}
					on:close={() => {
						notifications.dismissNotification(n.id);
					}}
				>
					{#each n.actions as action}
						<a href={action.href} class="underline hover:no-underline font-bold">{action.label}</a>
					{/each}
				</Alert>
			{/each}
		</div>
	</section>

	<main class="app-main bg-gray-100 dark:bg-gray-900">
		<Nav org={data.org} />
		<section class="max-w-7xl mx-auto py-4 px-4">
			<slot />
		</section>
	</main>

	<footer class="app-footer p-4 bg-white shadow md:px-6 md:py-8 dark:bg-gray-800">
		<div class="max-w-7xl mx-auto">
			<div class="sm:flex sm:items-end sm:justify-between">
				<ul
					class="flex flex-wrap items-center mb-6 text-sm text-gray-500 sm:mb-0 dark:text-gray-400"
				>
					<li>
						<a href="/" class="mr-4 hover:underline md:mr-6">{m.home()}</a>
					</li>
					<li>
						<a href="/privacy" class="mr-4 hover:underline md:mr-6">{m.privacyPolicy()}</a>
					</li>
					<li>
						<a href="/terms" class="mr-4 hover:underline md:mr-6">{m.termsOfService()}</a>
					</li>
					<li>
						<a href="/contact" class="hover:underline">{m.contactCTA()}</a>
					</li>
				</ul>
			</div>
			<hr class="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" />
			<span class="block text-sm text-gray-500 sm:text-center dark:text-gray-400"
				>{m.tagline()}</span
			>
		</div>
	</footer>
</div>

<style lang="postcss" global>
	html,
	body {
		height: 100%;
	}

	.app-wrapper {
		min-height: 100%;
		display: grid;
		@apply bg-gray-500;
		grid-template-rows: 1fr auto;
	}

	.app-footer {
		grid-row-start: 2;
		grid-row-end: 3;
	}
</style>
