<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import StatusTag from '$lib/components/StatusTag.svelte';
	import Button from '$lib/components/Button.svelte';
	import { getContext } from 'svelte';
	import type { AchievementClaim, User } from '@prisma/client';
	import Pagination from '$lib/components/Pagination.svelte';
	import { PAGE_QUERY_PARAM, PAGE_SIZE_QUERY_PARAM } from '$lib/utils/pagination';

	type AchievementClaimTableData = AchievementClaim & {
		user: User;
		_count: {
			endorsements: number;
		};
	};

	export let data: {
		pageSize: number;
		page: number;
		total: number;
	};

	let claims: AchievementClaimTableData[] = [];

	$: ({ pageSize, page, total } = data);

	const session = getContext('session');
	const achievementId = getContext('achievementId');

	const getFetchUrl = (pageToFetch: number) => {
		return `/claims?achievementId=${achievementId}&${PAGE_QUERY_PARAM}=${pageToFetch}&${PAGE_SIZE_QUERY_PARAM}=${pageSize}`;
	};

	const getData = async (pageToFetch: number) => {
		const res = await fetch(getFetchUrl(pageToFetch));
		const responseJson = await res.json();
		page = responseJson.page;
		pageSize = responseJson.pageSize;
		total = responseJson.total;
		claims = responseJson.claims;
	};
</script>

{#await getData(page)}
	Loading...
{:then}
	<div>
		<Pagination paging={{ page, count: total, pageSize, action: getData }} />
		<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
			<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
				<tr>
					<th scope="col" class="px-6 py-3"> {m.member()} </th>
					<th scope="col" class="px-6 py-3"> {m.status()} </th>
					<th scope="col" class="px-6 py-3"> {m.endorsement_other()} </th>
					<th scope="col" class="px-6 py-3"> {m.action_other()} </th>
				</tr>
			</thead>
			<tbody>
				{#each claims || [] as memberClaim (memberClaim.id)}
					{#if memberClaim.user && memberClaim._count}
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
							<th
								scope="row"
								class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
							>
								<a href={`/claims/${memberClaim.id}`} class="hover:underline">
									{memberClaim.user?.givenName}
									{memberClaim.user?.familyName}
									{#if session?.user?.id == memberClaim.user.id}({m.me()}){/if}
								</a>
							</th>
							<td class="px-6 py-4">
								<StatusTag
									status={memberClaim.claimStatus}
									validFrom={memberClaim.validFrom}
									validUntil={memberClaim.validUntil}
								/>
							</td>
							<td class="px-6 py-4">
								{memberClaim._count.endorsements}
							</td>
							<td class="px-6 py-4">
								{#if session?.user?.id}
									<a href={`/claims/${memberClaim.id}`}>
										<Button text={m.view()} />
									</a>
								{/if}
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/await}
