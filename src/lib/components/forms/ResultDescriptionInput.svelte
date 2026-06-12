<script lang="ts">
	import * as m from '$lib/i18n/messages';

	import FormFieldLabel from './FormFieldLabel.svelte';

	// A single rubric criterion (OB3 ResultDescription) editor row. Existing rows carry
	// an `id` (hidden) so the server diff can match by id; new rows have none.
	interface RubricRow {
		id?: string;
		name: string;
		allowedValue: string[];
	}

	interface Props {
		resultDescription: RubricRow;
		index: number;
		onRemove: () => void;
	}

	let { resultDescription = $bindable(), index, onRemove }: Props = $props();

	const nameInputId = $derived(`rd_${index}_name`);

	function addValue() {
		resultDescription.allowedValue = [...resultDescription.allowedValue, ''];
	}
	function removeValue(j: number) {
		resultDescription.allowedValue = resultDescription.allowedValue.filter((_v, k) => k !== j);
	}
</script>

<div
	class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-800"
>
	<div class="flex justify-between items-start mb-4">
		<h4 class="text-sm font-semibold text-gray-900 dark:text-white">
			{m.plain_jolly_wren_count({ number: index + 1 })}
		</h4>
		<button
			type="button"
			onclick={onRemove}
			class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium underline-offset-2 hover:underline"
		>
			{m.bold_true_wolf_part()}
		</button>
	</div>

	{#if resultDescription.id}
		<input type="hidden" name={`resultDescription[${index}].id`} value={resultDescription.id} />
	{/if}

	<div class="space-y-4">
		<div>
			<FormFieldLabel for={nameInputId}>{m.tidy_swift_lark_name()}</FormFieldLabel>
			<input
				type="text"
				id={nameInputId}
				name={`resultDescription[${index}].name`}
				bind:value={resultDescription.name}
				class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
				required
			/>
		</div>

		<div>
			<FormFieldLabel>{m.mellow_keen_vole_scale()}</FormFieldLabel>
			{#each resultDescription.allowedValue as value, j (j)}
				<div class="flex gap-2 mb-2">
					<input
						type="text"
						name={`resultDescription[${index}].allowedValue[${j}]`}
						{value}
						oninput={(e) => (resultDescription.allowedValue[j] = e.currentTarget.value)}
						class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
					/>
					<button
						type="button"
						onclick={() => removeValue(j)}
						class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
						aria-label={m.bold_true_wolf_part()}
					>
						&times;
					</button>
				</div>
			{/each}
			<button
				type="button"
				onclick={addValue}
				class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
			>
				+ {m.brisk_fair_moth_add()}
			</button>
		</div>
	</div>
</div>
