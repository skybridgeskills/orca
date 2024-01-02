<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { getContext } from 'svelte';
	import type { ClaimEndorsement, User } from '@prisma/client';
	import { evidenceItem } from '$lib/utils/evidenceItem';
	import ActionHeading from './ActionHeading.svelte';
	import Card from './Card.svelte';
	import EvidenceItem from './EvidenceItem.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { PAGE_QUERY_PARAM, PAGE_SIZE_QUERY_PARAM } from '$lib/utils/pagination';

	type EndorsementTableData = ClaimEndorsement & {
		creator: User | null;
	};

	const claimId = getContext('claimId');

	export let data: {
		pageSize: number;
		page: number;
		total: number;
	};

	let endorsements: EndorsementTableData[] = [];

	$: ({ pageSize, page, total } = data);

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
	{m.status_loading()}
{:then}
	<div>
		<Pagination paging={{ page, count: total, pageSize, action: getData }} />
		{#each endorsements as endorsement (endorsement.id)}
			<Card maxWidth="max-w-2xl mb-3">
				<ActionHeading>
					<span slot="heading" class="dark:text-gray-400">
						{#if endorsement.creator?.givenName || endorsement.creator?.familyName}
							{endorsement.creator?.givenName || ''}
							{endorsement.creator?.familyName || ''}
						{/if}
					</span>
					<span slot="actions" class="dark:text-gray-400"
						>{new Date(endorsement.createdAt).toDateString()}</span
					>
				</ActionHeading>

				<EvidenceItem item={evidenceItem(endorsement)} />
			</Card>
		{/each}
	</div>
{/await}
