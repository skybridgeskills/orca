<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { Alignment } from '$lib/data/alignment';
	import FormFieldLabel from './FormFieldLabel.svelte';

	export let alignment: Alignment;
	export let onRemove: () => void;
	export let index: number;

	$: targetUrlInputId = `alignment_${index}_targetUrl`;
	$: targetNameInputId = `alignment_${index}_targetName`;
	$: targetDescriptionInputId = `alignment_${index}_targetDescription`;
	$: targetCodeInputId = `alignment_${index}_targetCode`;
</script>

<div
	class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-800"
>
	<div class="flex justify-between items-start mb-4">
		<h4 class="text-sm font-semibold text-gray-900 dark:text-white">
			{m.sharp_cool_lynx_trace({ number: index + 1 })}
		</h4>
		<button
			type="button"
			on:click={onRemove}
			class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium underline-offset-2 hover:underline"
		>
			{m.bold_true_wolf_part()}
		</button>
	</div>

	<div class="space-y-4">
		<div>
			<FormFieldLabel for={targetUrlInputId}>
				{m.bright_swift_hawk_seek()}
			</FormFieldLabel>
			<input
				type="url"
				id={targetUrlInputId}
				name={`alignment[${index}].targetUrl`}
				bind:value={alignment.targetUrl}
				placeholder="https://example.com/framework/skill-123"
				class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
				required
			/>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				{m.deep_still_raven_think()}
			</p>
		</div>

		<div>
			<FormFieldLabel for={targetNameInputId}>
				{m.warm_kind_seal_call()}
			</FormFieldLabel>
			<input
				type="text"
				id={targetNameInputId}
				name={`alignment[${index}].targetName`}
				bind:value={alignment.targetName}
				placeholder={m.sunny_quiet_frog_rest()}
				class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
				required
			/>
		</div>

		<div>
			<FormFieldLabel for={targetDescriptionInputId}>
				{m.crisp_fresh_stork_fly()}
			</FormFieldLabel>
			<textarea
				id={targetDescriptionInputId}
				name={`alignment[${index}].targetDescription`}
				bind:value={alignment.targetDescription}
				rows="2"
				placeholder={m.misty_grand_elk_roam()}
				class="block p-2.5 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
			/>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				{m.light_fair_dove_wish()}
			</p>
		</div>

		<div>
			<FormFieldLabel for={targetCodeInputId}>
				{m.sharp_bright_crow_peek()}
			</FormFieldLabel>
			<input
				type="text"
				id={targetCodeInputId}
				name={`alignment[${index}].targetCode`}
				bind:value={alignment.targetCode}
				placeholder={m.calm_gentle_stoat_run()}
				class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
			/>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				{m.light_fair_dove_wish()}
			</p>
		</div>
	</div>
</div>
