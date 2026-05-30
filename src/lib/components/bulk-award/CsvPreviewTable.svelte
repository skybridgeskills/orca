<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import type { BulkAwardRow } from './bulkAwardTypes';

	export let rows: BulkAwardRow[];

	const dispatch = createEventDispatcher<{ start: void; back: void }>();
</script>

<div class="mb-4">
	<p class="text-sm text-gray-600 dark:text-gray-400">
		{m.fresh_clear_otter_ready({ count: rows.length })}
	</p>
</div>

<div class="overflow-x-auto mb-6">
	<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
		<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
			<tr>
				<th class="px-4 py-3">#</th>
				<th class="px-4 py-3">{m.direct_top_giraffe_login()}</th>
				<th class="px-4 py-3">{m.patchy_crazy_marten_march()}</th>
				<th class="px-4 py-3">{m.calm_steady_lynx_evidence()}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, index}
				<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
					<td class="px-4 py-3 text-gray-900 dark:text-white">{index + 1}</td>
					<td class="px-4 py-3">{row.email}</td>
					<td class="px-4 py-3 max-w-xs truncate">{row.narrative}</td>
					<td class="px-4 py-3 max-w-xs truncate">{row.evidenceUrl}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<div class="flex gap-2">
	<Button text={m.quiet_soft_hare_turn()} submodule="secondary" on:click={() => dispatch('back')} />
	<Button text={m.bold_warm_eagle_begin()} submodule="primary" on:click={() => dispatch('start')} />
</div>
