<script lang="ts">
	import { onMount } from 'svelte';
	import { MetaTags } from 'svelte-meta-tags';

	import Alert from '$lib/components/Alert.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import * as m from '$lib/i18n/messages';
	import { setLocale } from '$lib/i18n/runtime';
	import { LoadingStatus } from '$lib/stores/common';
	import { preferredTheme } from '$lib/stores/interfacePrefsStore';
	import { notifications } from '$lib/stores/notificationStore';
	import { session, sessionStatus } from '$lib/stores/sessionStore';
	import '../app.css';
	import { getFooterUrl } from '$lib/utils/footer-links';

	import type { LayoutProps } from './$types';

	import { resolve } from '$app/paths';

	let { children, data }: LayoutProps = $props();
	const privacyUrl = getFooterUrl('privacy', '/privacy');
	const termsUrl = getFooterUrl('terms', '/terms');
	const contactUrl = getFooterUrl('contact', '/contact');
	// One-time init side-effects intentionally use the initial `data`;
	// preferredTheme is re-initialized in onMount below.
	// svelte-ignore state_referenced_locally
	preferredTheme.initialize(data.cookieTheme || 'light');
	// svelte-ignore state_referenced_locally
	setLocale(data.locale);

	onMount(() => {
		preferredTheme.initialize(data.cookieTheme || 'light'); // reinitialize but with the ability to set document.cookie
		if (data.session) $session = data.session;
		$sessionStatus = LoadingStatus.Complete;
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
					dismissable={n.dismissable}
					level={n.level}
					onclose={() => {
						notifications.dismiss(n.id);
					}}
				>
					{#each n.actions as action (action.href)}
						<a href={action.href} rel="external" class="underline hover:no-underline font-bold"
							>{action.label}</a
						>
					{/each}
				</Alert>
			{/each}
		</div>
	</section>

	<main class="app-main bg-gray-100 dark:bg-gray-900">
		<Nav org={data.org} />
		<section class="max-w-7xl mx-auto py-4 px-4">
			{@render children()}
		</section>
	</main>

	<footer class="app-footer p-4 bg-white shadow-sm md:px-6 md:py-8 dark:bg-gray-800">
		<div class="max-w-7xl mx-auto">
			<div class="sm:flex sm:items-end sm:justify-between">
				<ul
					class="flex flex-wrap items-center mb-6 text-sm text-gray-500 sm:mb-0 dark:text-gray-400"
				>
					<li>
						<a href={resolve('/')} class="mr-4 hover:underline md:mr-6"
							>{m.each_fluffy_fox_view()}</a
						>
					</li>
					<li>
						{#if privacyUrl.startsWith('http')}
							<a href={privacyUrl} rel="external" class="mr-4 hover:underline md:mr-6"
								>{m.warm_tangy_deer_privacy()}</a
							>
						{:else}
							<a href={resolve(privacyUrl)} class="mr-4 hover:underline md:mr-6"
								>{m.warm_tangy_deer_privacy()}</a
							>
						{/if}
					</li>
					<li>
						{#if termsUrl.startsWith('http')}
							<a href={termsUrl} rel="external" class="mr-4 hover:underline md:mr-6"
								>{m.gentle_brave_falcon_terms()}</a
							>
						{:else}
							<a href={resolve(termsUrl)} class="mr-4 hover:underline md:mr-6"
								>{m.gentle_brave_falcon_terms()}</a
							>
						{/if}
					</li>
					<li>
						{#if contactUrl.startsWith('http')}
							<a href={contactUrl} rel="external" class="hover:underline"
								>{m.calm_steady_lynx_contact()}</a
							>
						{:else}
							<a href={resolve(contactUrl)} class="hover:underline"
								>{m.calm_steady_lynx_contact()}</a
							>
						{/if}
					</li>
				</ul>
			</div>
			<hr class="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" />
			<span class="block text-sm text-gray-500 sm:text-center dark:text-gray-400"
				>{data.org.json?.tagline || m.legal_factual_lamb_jump()}</span
			>
		</div>
	</footer>
</div>

<style lang="postcss">
	@reference '../app.css';

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
