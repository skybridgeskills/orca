<script lang="ts">
	import { Icon } from 'svelte-icons-pack';
	import { FiSearch } from 'svelte-icons-pack/fi';

	import Button from '$lib/components/Button.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Tag from '$lib/components/Tag.svelte';
	import * as m from '$lib/i18n/messages';
	import { calculatePageAndSize } from '$lib/utils/pagination';

	import type { PageProps } from './$types';

	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	let { data }: PageProps = $props();
	const members = $derived(data.members);
</script>

<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
	<div>
		<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
			{m.pink_shy_penguin_express()}
		</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{m.wide_known_myna_spill()}</p>
	</div>
	<!-- A plain GET form: the loader runs the search, so it works without JavaScript. -->
	<form
		method="GET"
		action={resolve('/members')}
		role="search"
		class="flex w-full items-center gap-2 sm:w-auto"
	>
		<label for="members_searchInput" class="sr-only">{m.neat_quiet_finch_look()}</label>
		<div class="relative min-w-0 flex-1 text-gray-900 sm:flex-none dark:text-white">
			<div class="absolute inset-y-0 inset-s-0 flex items-center ps-3 pointer-events-none">
				<Icon src={FiSearch} size="16" color="currentColor" />
			</div>
			<input
				type="search"
				id="members_searchInput"
				name="q"
				value={data.q}
				placeholder={data.viewerIsAdmin ? m.pale_swift_gecko_probe() : m.calm_dry_newt_probe()}
				class="pl-10 bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
			/>
		</div>
		<!-- `Button` is full-width below `sm`; keep the buttons at their natural width. -->
		<div class="shrink-0"><Button buttonType="submit">{m.bold_fresh_kite_seek()}</Button></div>
		{#if data.q}
			<div class="shrink-0">
				<Button submodule="secondary" href="/members">{m.helpful_lost_angelfish_startle()}</Button>
			</div>
		{/if}
	</form>
</div>

{#if data.q}
	<!-- Searching: one page of results, no pager; say what was searched and how many matched. -->
	<p class="mb-4 text-sm text-gray-700 dark:text-gray-300" aria-live="polite">
		{#if data.count === 0}
			{m.empty_still_ibis_miss({ q: data.q })}
		{:else if data.count > members.length}
			{m.brief_wide_heron_trim({ shown: members.length, total: data.count, q: data.q })}
		{:else if data.count === 1}
			{m.lone_glad_ibis_match({ q: data.q })}
		{:else}
			{m.many_glad_ibis_match({ count: data.count, q: data.q })}
		{/if}
	</p>
{:else}
	<Pagination paging={{ ...calculatePageAndSize($page.url), count: data.count }} />
{/if}

<ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
	{#each members as member (member.id)}
		<li
			class="p-6 max-w-md bg-white rounded-lg border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700"
		>
			{#if member.linkable}
				<a href={resolve(`/members/${member.id}`)}>
					<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
						{member.givenName}
						{member.familyName}
						{#if member.orgRole}<Tag open={true}>{m.sharp_clear_fox_admin()}</Tag>{/if}
					</h5>
				</a>
				<a
					href={resolve(`/members/${member.id}`)}
					class="inline-flex items-center py-2 px-3 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
				>
					{m.mellow_dry_panther_fry()}
					<svg
						aria-hidden="true"
						class="ml-2 -mr-1 w-4 h-4"
						fill="currentColor"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
						><path
							fill-rule="evenodd"
							d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/></svg
					>
				</a>
			{:else}
				<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
					{member.givenName}
					{member.familyName}
					{#if member.orgRole}<Tag open={true}>{m.sharp_clear_fox_admin()}</Tag>{/if}
				</h5>
			{/if}
		</li>
	{/each}
</ul>
