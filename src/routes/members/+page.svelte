<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
	import Pagination from '$lib/components/Pagination.svelte';
	import Tag from '$lib/components/Tag.svelte';
	import { calculatePageAndSize } from '$lib/utils/pagination';
	import type { PageData } from './$types';

	export let data: PageData;
	let members = data.members;
</script>

<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">{m.members_title()}</h1>
<p class="mt-1 mb-8 text-sm text-gray-500 dark:text-gray-400">{m.members_description()}</p>

<Pagination paging={{ ...calculatePageAndSize($page.url), count: data.count }} />

<ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
	{#each members as member}
		<li
			class="p-6 max-w-md bg-white rounded-lg border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700"
		>
			<a href="/members/{member.id}">
				<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
					{member.givenName}
					{member.familyName}
					{#if member.orgRole}<Tag open={true}>{m.adminRoleLabel()}</Tag>{/if}
				</h5>
			</a>
			<a
				href="/members/{member.id}"
				class="inline-flex items-center py-2 px-3 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
			>
				{m.member_memberDetailsLabel()}
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
		</li>
	{/each}
</ul>
