<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { createEventDispatcher, onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import BulkAwardStatusIcon from './BulkAwardStatusIcon.svelte';
	import { waitForBulkAwardRequestInterval } from '$lib/config/bulkAward';
	import type { BulkAwardApiMeta, BulkAwardRow, BulkAwardRowStatus } from './bulkAwardTypes';

	export let rows: BulkAwardRow[];
	export let achievementId: string;
	export let autoStart = true;

	const dispatch = createEventDispatcher<{ done: void }>();

	let rowStatuses: BulkAwardRowStatus[] = rows.map(() => ({ status: 'pending' }));
	let processing = false;

	$: newCount = rowStatuses.filter((row) => row.status === 'success_new').length;
	$: existingCount = rowStatuses.filter((row) => row.status === 'success_existing').length;
	$: errorCount = rowStatuses.filter((row) => row.status === 'error').length;
	$: processedCount = newCount + existingCount + errorCount;
	$: percent = rows.length ? Math.round((processedCount / rows.length) * 100) : 0;

	onMount(() => {
		if (autoStart) {
			void processRows();
		}
	});

	function parseAwardMeta(body: unknown): BulkAwardApiMeta | undefined {
		if (!body || typeof body !== 'object' || !('meta' in body)) return undefined;
		const meta = (body as { meta?: { award?: BulkAwardApiMeta } }).meta;
		return meta?.award;
	}

	function parseAwardEndorsement(body: unknown): { claimId?: string; endorsementId?: string } {
		if (!body || typeof body !== 'object' || !('data' in body)) return {};
		const data = (body as { data?: unknown[] }).data;
		const endorsement = data?.[0];
		if (!endorsement || typeof endorsement !== 'object') return {};

		const record = endorsement as {
			id?: string;
			claimId?: string | null;
			claim?: { id?: string };
		};

		const claimId = record.claimId ?? record.claim?.id ?? undefined;
		const endorsementId = record.id && record.id !== '' ? record.id : undefined;

		return { claimId, endorsementId };
	}

	function resolveAwardIds(body: unknown): { claimId?: string; endorsementId?: string } {
		const award = parseAwardMeta(body);
		const fromData = parseAwardEndorsement(body);

		const claimId = award?.claimId ?? fromData.claimId ?? undefined;
		const endorsementId =
			(award?.endorsementId && award.endorsementId !== '' ? award.endorsementId : undefined) ??
			fromData.endorsementId;

		return { claimId, endorsementId };
	}

	function buildDetailHref(params: {
		claimId?: string;
		endorsementId?: string;
		email: string;
	}): string | undefined {
		if (params.claimId) {
			return `/claims/${params.claimId}`;
		}
		if (params.endorsementId) {
			return `/invites/${params.endorsementId}`;
		}
		return undefined;
	}

	async function awardRow(index: number) {
		rowStatuses[index] = { status: 'processing' };
		rowStatuses = rowStatuses;

		try {
			const response = await fetch(`/api/v1/achievements/${achievementId}/award`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: rows[index].email,
					narrative: rows[index].narrative,
					evidenceUrl: rows[index].evidenceUrl,
					emailIfNew: true
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				const message =
					typeof errorData?.message === 'string' ? errorData.message : `HTTP ${response.status}`;
				rowStatuses[index] = {
					status: 'error',
					error: message,
					processedAt: new Date().toISOString()
				};
			} else {
				const body = await response.json();
				const award = parseAwardMeta(body);
				const { claimId, endorsementId } = resolveAwardIds(body);
				const created = award?.created ?? true;
				rowStatuses[index] = {
					status: created ? 'success_new' : 'success_existing',
					created,
					invited: award?.invited,
					claimId,
					endorsementId,
					detailHref: buildDetailHref({
						claimId,
						endorsementId,
						email: rows[index].email
					}),
					processedAt: new Date().toISOString()
				};
			}
		} catch (err) {
			rowStatuses[index] = {
				status: 'error',
				error: err instanceof Error ? err.message : 'Network error',
				processedAt: new Date().toISOString()
			};
		}

		rowStatuses = rowStatuses;
	}

	async function processRows(indices?: number[]) {
		processing = true;
		const targets = indices ?? rows.map((_, index) => index);

		for (let i = 0; i < targets.length; i++) {
			if (!processing) break;
			await awardRow(targets[i]);
			if (i < targets.length - 1) {
				await waitForBulkAwardRequestInterval();
			}
		}

		processing = false;
		dispatch('done');
	}

	async function retryFailed() {
		const failedIndices = rowStatuses
			.map((row, index) => (row.status === 'error' ? index : -1))
			.filter((index) => index >= 0);

		if (failedIndices.length === 0) return;
		await processRows(failedIndices);
	}

	function statusLabel(status: BulkAwardRowStatus['status']) {
		switch (status) {
			case 'pending':
				return m.calm_flat_mole_wait();
			case 'processing':
				return m.bright_quick_robin_spin();
			case 'success_new':
				return m.warm_green_frog_done();
			case 'success_existing':
				return m.keen_amber_lynx_updated();
			case 'error':
				return m.sharp_red_crab_fail();
		}
	}

	function statusClass(status: BulkAwardRowStatus['status']) {
		switch (status) {
			case 'pending':
				return 'text-gray-500 dark:text-gray-400';
			case 'processing':
				return 'text-blue-600 dark:text-blue-400';
			case 'success_new':
				return 'text-green-700 dark:text-green-400';
			case 'success_existing':
				return 'text-amber-600 dark:text-amber-400';
			case 'error':
				return 'text-red-700 dark:text-red-400';
		}
	}

	function rowClass(status: BulkAwardRowStatus['status']) {
		if (status === 'error') {
			return 'bg-red-50 dark:bg-red-900/20';
		}
		return 'bg-white dark:bg-gray-800';
	}
</script>

<div class="mb-6">
	<div class="flex justify-between mb-1">
		<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
			{m.steady_gray_falcon_track({ processed: processedCount, total: rows.length })}
		</span>
		<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{percent}%</span>
	</div>
	<div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
		<div
			class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
			style="width: {percent}%"
		/>
	</div>
</div>

<div class="overflow-x-auto mb-6">
	<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
		<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
			<tr>
				<th class="px-4 py-3">#</th>
				<th class="px-4 py-3 min-w-[10rem]">{m.plain_gray_hawk_state()}</th>
				<th class="px-4 py-3">{m.direct_top_giraffe_login()}</th>
				<th class="px-4 py-3">{m.patchy_crazy_marten_march()}</th>
				<th class="px-4 py-3">{m.calm_steady_lynx_evidence()}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, index}
				<tr class="{rowClass(rowStatuses[index].status)} border-b dark:border-gray-700">
					<td class="px-4 py-2 align-middle text-gray-900 dark:text-white">{index + 1}</td>
					<td class="px-4 py-2 align-middle min-w-[10rem]">
						<div class="flex items-center gap-2">
							<BulkAwardStatusIcon status={rowStatuses[index].status} />
							<div class="min-w-0">
								<span class={statusClass(rowStatuses[index].status)}>
									{statusLabel(rowStatuses[index].status)}
								</span>
								{#if rowStatuses[index].error}
									<p class="text-xs text-red-700 dark:text-red-400 mt-1 break-words">
										{rowStatuses[index].error}
									</p>
								{/if}
							</div>
						</div>
					</td>
					<td class="px-4 py-2 align-middle">
						{#if rowStatuses[index].detailHref}
							<a href={rowStatuses[index].detailHref} class="text-blue-700 hover:underline">
								{row.email}
							</a>
						{:else}
							{row.email}
						{/if}
					</td>
					<td class="px-4 py-2 align-middle max-w-xs truncate">{row.narrative}</td>
					<td class="px-4 py-2 align-middle max-w-xs truncate">{row.evidenceUrl}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if !processing}
	<div class="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
		<p class="text-sm text-gray-700 dark:text-gray-300">
			{m.broad_steady_bear_breakdown({
				newCount,
				existingCount,
				failedCount: errorCount,
				total: rows.length
			})}
		</p>
		{#if errorCount > 0}
			<div class="mt-3">
				<Button text={m.brave_red_fox_retry()} submodule="secondary" on:click={retryFailed} />
			</div>
		{/if}
	</div>
{/if}
