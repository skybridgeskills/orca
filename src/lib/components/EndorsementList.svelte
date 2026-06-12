<script lang="ts">
	import type { ClaimEndorsement, User } from '@prisma/client';
	import { getContext } from 'svelte';

	import Pagination from '$lib/components/Pagination.svelte';
	import * as m from '$lib/i18n/messages';
	import { evidenceItem } from '$lib/utils/evidenceItem';
	import { PAGE_QUERY_PARAM, PAGE_SIZE_QUERY_PARAM } from '$lib/utils/pagination';

	import ActionHeading from './ActionHeading.svelte';
	import Card from './Card.svelte';
	import EvidenceItem from './EvidenceItem.svelte';

	type EndorsementTableData = ClaimEndorsement & {
		creator: User | null;
		results?: App.Result[];
		current?: boolean;
	};

	const claimId = getContext('claimId');

	interface Props {
		data: {
			pageSize: number;
			page: number;
			total: number;
		};
	}

	let { data }: Props = $props();

	// `page`, `pageSize` and `total` are seeded from `data` once and then
	// reassigned in `getData` (rule 3: locally mutated). Reading the prop inside
	// an init closure avoids `state_referenced_locally` while preserving the
	// original synchronous seeding (the first `getData(page)` call relies on
	// `pageSize` already being set).
	const initialPaging = () => ({ page: data.page, pageSize: data.pageSize, total: data.total });
	let page = $state(initialPaging().page);
	let pageSize = $state(initialPaging().pageSize);
	let total = $state(initialPaging().total);

	let endorsements: EndorsementTableData[] = $state([]);

	const getFetchUrl = (pageToFetch: number) => {
		return `/endorsements?claimId=${claimId}&${PAGE_QUERY_PARAM}=${pageToFetch}&${PAGE_SIZE_QUERY_PARAM}=${pageSize}`;
	};

	const getData = async (pageToFetch: number) => {
		const res = await fetch(getFetchUrl(pageToFetch));
		const responseJson = await res.json();
		page = responseJson.page;
		pageSize = responseJson.pageSize;
		total = responseJson.total;
		endorsements = responseJson.endorsements;
	};
</script>

{#await getData(page)}
	{m.merry_stout_rabbit_enchant()}
{:then}
	<div>
		<Pagination paging={{ page, count: total, pageSize, action: getData }} />
		{#each endorsements as endorsement (endorsement.id)}
			<Card maxWidth="max-w-2xl mb-3">
				<ActionHeading>
					{#snippet heading()}
						<span class="dark:text-gray-400">
							{#if endorsement.creator?.givenName || endorsement.creator?.familyName}
								{endorsement.creator?.givenName || ''}
								{endorsement.creator?.familyName || ''}
							{/if}
						</span>
					{/snippet}
					{#snippet actions()}
						<span class="dark:text-gray-400">{new Date(endorsement.createdAt).toDateString()}</span>
					{/snippet}
				</ActionHeading>

				<EvidenceItem item={evidenceItem(endorsement)} />

				{#if endorsement.results?.length}
					<div class="mt-2 text-sm text-gray-700 dark:text-gray-400">
						{#each endorsement.results as result (result.resultDescription)}
							<span class="inline-block mr-3">
								<span class="font-medium">{result.name}:</span>
								{result.value}
							</span>
						{/each}
						{#if endorsement.current === false}
							<span
								class="ml-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200"
							>
								{m.dizzy_keen_owl_stale()}
							</span>
						{/if}
					</div>
				{/if}
			</Card>
		{/each}
	</div>
{/await}
