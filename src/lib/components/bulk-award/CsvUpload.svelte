<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { createEventDispatcher } from 'svelte';
	import Papa from 'papaparse';
	import Alert from '$lib/components/Alert.svelte';
	import type { BulkAwardRow } from './bulkAwardTypes';

	const dispatch = createEventDispatcher<{ parsed: BulkAwardRow[] }>();

	const REQUIRED_COLUMNS = ['email', 'narrative', 'evidenceUrl'];
	const MAX_ROWS = 500;

	let error = '';
	let fileInput: HTMLInputElement;

	function normalizeRow(row: Record<string, unknown>): BulkAwardRow {
		const normalized: Record<string, string> = {};
		for (const [key, value] of Object.entries(row)) {
			normalized[key.toLowerCase().trim()] = typeof value === 'string' ? value.trim() : '';
		}

		return {
			email: normalized.email ?? '',
			narrative: normalized.narrative ?? '',
			evidenceUrl: normalized.evidenceurl ?? ''
		};
	}

	function parseCsvFile(file: File) {
		error = '';

		Papa.parse<Record<string, unknown>>(file, {
			header: true,
			skipEmptyLines: true,
			complete(results) {
				const headers = results.meta.fields?.map((field) => field.toLowerCase().trim()) ?? [];
				const missing = REQUIRED_COLUMNS.filter(
					(column) => !headers.includes(column.toLowerCase())
				);

				if (missing.length > 0) {
					error = m.sharp_red_fox_columns({ columns: missing.join(', ') });
					return;
				}

				const rows = results.data.map(normalizeRow);

				if (rows.length > MAX_ROWS) {
					error = m.tired_gray_wolf_limit({ count: rows.length });
					return;
				}

				const emptyEmailCount = rows.filter((row) => !row.email).length;
				if (emptyEmailCount > 0) {
					error = m.odd_plain_dove_email({ count: emptyEmailCount });
					return;
				}

				dispatch('parsed', rows);
			},
			error() {
				error = m.sunny_grand_lemur_race();
			}
		});
	}

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		parseCsvFile(file);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		const file = event.dataTransfer?.files?.[0];
		if (!file) return;
		parseCsvFile(file);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function openFilePicker() {
		fileInput?.click();
	}

	function downloadExample() {
		const csv =
			'email,narrative,evidenceUrl\njane@example.com,Demonstrated excellent leadership skills,https://portfolio.example.com/leadership';
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'bulk-award-example.csv';
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-4">
	{#if error}
		<Alert message={error} level="error" />
	{/if}

	<div
		class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
		role="button"
		tabindex="0"
		on:click={openFilePicker}
		on:keydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') openFilePicker();
		}}
		on:drop={handleDrop}
		on:dragover={handleDragOver}
	>
		<input
			bind:this={fileInput}
			type="file"
			accept=".csv,text/csv"
			class="hidden"
			on:change={handleFileChange}
		/>
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.bright_calm_falcon_upload()}</p>
	</div>

	<p class="text-sm">
		<button type="button" class="text-blue-700 hover:underline" on:click={downloadExample}>
			{m.quick_soft_badger_example()}
		</button>
	</p>
</div>
