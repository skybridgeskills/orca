<script lang="ts">
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import BulkAwardProgress from '$lib/components/bulk-award/BulkAwardProgress.svelte';
	import type { BulkAwardRow } from '$lib/components/bulk-award/bulkAwardTypes';
	import CsvPreviewTable from '$lib/components/bulk-award/CsvPreviewTable.svelte';
	import CsvUpload from '$lib/components/bulk-award/CsvUpload.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import * as m from '$lib/i18n/messages';

	import type { PageData } from './$types';

	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

	let rows: BulkAwardRow[] = $state([]);
	let phase: 'upload' | 'preview' | 'processing' | 'done' = $state('upload');
	let processingKey = $state(0);

	const breadcrumbItems = $derived([
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: m.antsy_grand_rabbit_gaze(), href: '/achievements' },
		{ text: data.achievement?.name, href: `/achievements/${data.achievement.id}` },
		{ text: m.gentle_brave_falcon_award(), href: `/achievements/${data.achievement.id}/award` }
	]);

	function handleParsed(parsedRows: BulkAwardRow[]) {
		rows = parsedRows;
		phase = 'preview';
	}

	function handleBack() {
		phase = 'upload';
		rows = [];
	}

	function handleStart() {
		processingKey += 1;
		phase = 'processing';
	}

	function handleDone() {
		phase = 'done';
	}
</script>

<Breadcrumbs items={breadcrumbItems} />
<div class="max-w-4xl">
	<Heading title={m.calm_swift_heron_award()} description={m.gentle_quiet_otter_awarddesc()} />

	<AchievementSummary achievement={data.achievement} />

	<div class="mt-6">
		{#if phase === 'upload'}
			<CsvUpload onparsed={handleParsed} />
		{:else if phase === 'preview'}
			<CsvPreviewTable {rows} onstart={handleStart} onback={handleBack} />
		{:else if phase === 'processing' || phase === 'done'}
			{#key processingKey}
				<BulkAwardProgress {rows} achievementId={data.achievement.id} ondone={handleDone} />
			{/key}
			{#if phase === 'done'}
				<div class="mt-4">
					<a
						href={resolve(`/achievements/${data.achievement.id}`)}
						class="text-blue-700 hover:underline text-sm"
					>
						{m.soft_blue_deer_return()}
					</a>
				</div>
			{/if}
		{/if}
	</div>
</div>
