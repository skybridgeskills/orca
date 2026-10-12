<script lang="ts">
	import type { Visibility } from '@prisma/client';
	import { onMount } from 'svelte';

	import * as m from '$lib/i18n/messages';
	import {
		NOTIFICATION_AUTO_DISMISS_MS,
		notifications,
		Notification
	} from '$lib/stores/notificationStore';

	import { enhance } from '$app/forms';

	/**
	 * The claim owner's "who can see this badge" control on `/claims/<id>`. Posts to the
	 * route's owner-only `setVisibility` action; works without JavaScript (Save is only
	 * disabled after hydration).
	 */
	interface Props {
		/** The claim's stored visibility. */
		saved: Visibility;
	}

	let { saved }: Props = $props();

	// ACHIEVEMENT behaves as COMMUNITY today and isn't offered; show it as Community.
	const normalize = (v: Visibility) => (v === 'ACHIEVEMENT' ? 'COMMUNITY' : v);
	// The parent wraps this in {#key saved}, so seeding from the prop once is intended.
	// svelte-ignore state_referenced_locally
	let selected = $state(normalize(saved));
	let hydrated = $state(false);
	let submitting = $state(false);
	onMount(() => {
		hydrated = true;
	});

	const dirty = $derived(selected !== normalize(saved));
	const leavingPublic = $derived(saved === 'PUBLIC' && selected !== 'PUBLIC');
	const hint = $derived.by(() => {
		switch (selected) {
			case 'PUBLIC':
				return m.open_broad_gull_reach();
			case 'PRIVATE':
				return m.still_close_wren_guard();
			default:
				return m.snug_quiet_otter_gather();
		}
	});
</script>

<form
	method="POST"
	action="?/setVisibility"
	class="max-w-2xl mb-4"
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			submitting = false;
			if (result.type === 'success') {
				notifications.add(
					new Notification(
						m.glad_neat_robin_settle(),
						true,
						'success',
						[],
						NOTIFICATION_AUTO_DISMISS_MS
					)
				);
			} else if (result.type === 'failure') {
				notifications.add(new Notification(m.sore_slow_crane_retry(), true, 'error'));
			}
		};
	}}
>
	<label
		for="claim_visibility"
		class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
		>{m.keen_plain_heron_watch()}</label
	>
	<div class="flex flex-col sm:flex-row gap-2 sm:items-center">
		<div class="relative w-full sm:flex-1">
			<select
				id="claim_visibility"
				name="visibility"
				bind:value={selected}
				aria-describedby="claim_visibility_hint"
				class="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full py-2.5 pl-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			>
				<option value="PUBLIC">{m.short_deft_lemur_clasp()}</option>
				<option value="COMMUNITY">{m.equal_small_dolphin_spur()}</option>
				<option value="PRIVATE">{m.pink_last_marten_grin()}</option>
			</select>
			<!-- Our own caret, inset from the border (the native one sits against it). -->
			<svg
				class="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-gray-500 dark:text-gray-400"
				viewBox="0 0 20 20"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					fill-rule="evenodd"
					d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
					clip-rule="evenodd"
				/>
			</svg>
		</div>
		<!-- The primary Button's classes, but disabled keeps the same blue (dimmed) so it
		     matches the page's other primary buttons rather than Button's light-blue state. -->
		<button
			type="submit"
			disabled={submitting || (hydrated && !dirty)}
			class="flex items-center justify-center focus:outline-hidden focus:ring-4 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center text-white bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{m.quick_safe_deer_save()}
		</button>
	</div>
	<p
		id="claim_visibility_hint"
		aria-live="polite"
		class="mt-2 text-sm text-gray-500 dark:text-gray-400"
	>
		{hint}
	</p>
	{#if leavingPublic}
		<p class="mt-1 text-sm text-amber-700 dark:text-amber-400" role="status">
			{m.wary_late_finch_break()}
		</p>
	{/if}
</form>
