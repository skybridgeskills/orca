<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';

	export let data: PageData;
</script>

{#if data.session?.user?.orgRole === 'GENERAL_ADMIN'}
	<div class="max-w-2xl flex justify-between items-center">
		<h1 class="inline-flex mt-1 mr-3 text-xl sm:text-2xl text-gray-800 dark:text-white">
			{m.about()}
			{data.org.name}
		</h1>
		<p class="">
			<a class="text-gray-900 dark:text-gray-100" href="/about/edit"
				><Button text={m.sharp_clear_fox_edit()} /></a
			>
		</p>
	</div>
{:else}
	<h1 class="max-w-2xl text-xl sm:text-2xl mb-3 text-gray-800 dark:text-white">
		{m.about()}
		{data.org.name}
	</h1>
{/if}

<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
	{data.org.description}
</p>

{#if data.org.url}
	<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
		{m.org_url()}
		<a class="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={data.org.url}
			>{data.org.url}</a
		>
	</p>
{/if}

<hr class="max-w-2xl mt-10" />
<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
	{m.org_usesOrca()}
</p>
