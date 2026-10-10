<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { PageData } from './$types';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import CsvUpload from '$lib/components/bulk-award/CsvUpload.svelte';
	import CsvPreviewTable from '$lib/components/bulk-award/CsvPreviewTable.svelte';
	import BulkAwardProgress from '$lib/components/bulk-award/BulkAwardProgress.svelte';
	import type { BulkAwardRow } from '$lib/components/bulk-award/bulkAwardTypes';

	export let data: PageData;

	let rows: BulkAwardRow[] = [];
	let phase: 'upload' | 'preview' | 'processing' | 'done' = 'upload';
	let processingKey = 0;

	const breadcrumbItems = [
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: m.antsy_grand_rabbit_gaze(), href: '/achievements' },
		{ text: data.achievement?.name, href: `/achievements/${data.achievement.id}` },
		{ text: m.gentle_brave_falcon_award(), href: `/achievements/${data.achievement.id}/award` }
	];

	function handleParsed(event: CustomEvent<BulkAwardRow[]>) {
		rows = event.detail;
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
			<CsvUpload on:parsed={handleParsed} />
		{:else if phase === 'preview'}
			<CsvPreviewTable {rows} on:start={handleStart} on:back={handleBack} />
		{:else if phase === 'processing' || phase === 'done'}
			{#key processingKey}
				<BulkAwardProgress {rows} achievementId={data.achievement.id} on:done={handleDone} />
			{/key}
			{#if phase === 'done'}
				<div class="mt-4">
					<a
						href="/achievements/{data.achievement.id}"
						class="text-blue-700 hover:underline text-sm"
					>
						{m.soft_blue_deer_return()}
					</a>
				</div>
			{/if}
		{/if}
	</div>
</div>
