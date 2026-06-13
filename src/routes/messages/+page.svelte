<script lang="ts">
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime.js';

	import Badge from '$lib/components/Badge.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import * as m from '$lib/i18n/messages';

	import type { PageData } from './$types';

	import { resolve } from '$app/paths';

	dayjs.extend(relativeTime);

	let { data }: { data: PageData } = $props();

	const breadcrumbItems = [
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: m.plain_calm_otter_inbox() }
	];

	function messageTitle(type: string): string {
		if (type === 'CONTENT_REPORTED') return m.plain_calm_otter_msg_reported();
		if (type === 'REVIEW_NEEDED') return m.plain_calm_otter_msg_review();
		return m.plain_calm_otter_msg_generic();
	}

	function targetTypeLabel(targetType: string): string {
		if (targetType === 'ACHIEVEMENT') return m.plain_calm_otter_target_achievement();
		if (targetType === 'CLAIM') return m.plain_calm_otter_target_claim();
		if (targetType === 'ENDORSEMENT') return m.plain_calm_otter_target_endorsement();
		return targetType;
	}
</script>

<Breadcrumbs items={breadcrumbItems} />

<Heading
	title={m.plain_calm_otter_inbox()}
	description={m.plain_calm_otter_inbox_desc()}
	level="h1"
/>

<Pagination paging={{ page: data.page, pageSize: data.pageSize, count: data.count }} />

{#if data.messages.length === 0}
	<p class="text-sm text-gray-500 dark:text-gray-400">{m.plain_calm_otter_inbox_empty()}</p>
{:else}
	<ul class="divide-y divide-gray-200 dark:divide-gray-700">
		{#each data.messages as message (message.id)}
			<li>
				<a
					href={resolve(`/messages/${message.id}`)}
					class="flex items-start justify-between gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded-sm"
				>
					<div class="min-w-0">
						<p class="font-medium text-gray-900 dark:text-white">
							{messageTitle(message.type)}
						</p>
						{#if message.report}
							<p class="text-sm text-gray-500 dark:text-gray-400 truncate">
								{targetTypeLabel(message.report.targetType)} — {message.report.reason}
							</p>
						{/if}
					</div>
					<span class="shrink-0 flex items-center gap-2">
						<span class="text-xs text-gray-400 whitespace-nowrap"
							>{dayjs(message.createdAt).fromNow()}</span
						>
						<Badge text={m.plain_calm_otter_open()} variant="info" />
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
