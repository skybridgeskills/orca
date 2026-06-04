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

	let page = $state(data.page);
	let pageSize = $state(data.pageSize);
	let total = $state(data.total);

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
			</Card>
		{/each}
	</div>
{/await}
