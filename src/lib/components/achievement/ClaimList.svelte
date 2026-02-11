<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import StatusTag from '$lib/components/StatusTag.svelte';

	import FaSolidTrash from 'svelte-icons-pack/fa/FaSolidTrash.js';
	import Button from '$lib/components/Button.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import { notifications, Notification } from '$lib/stores/notificationStore';
	import { getContext, onMount } from 'svelte';
	import type { AchievementClaim, ClaimEndorsement, User } from '@prisma/client';
	import Pagination from '$lib/components/Pagination.svelte';
	import { MAX_PAGE_SIZE, PAGE_QUERY_PARAM, PAGE_SIZE_QUERY_PARAM } from '$lib/utils/pagination';
	import IconButton from '$lib/components/IconButton.svelte';
	import Modal from '$lib/components/Modal.svelte';

	type AchievementClaimTableData = AchievementClaim & {
		user: User;
		_count: {
			endorsements: number;
		};
	};

	export let pageSize: number = MAX_PAGE_SIZE;
	export let page: number = 1;
	export let totalCount: number;
	export let enableInvites: boolean = false;

	let claims: AchievementClaimTableData[] = [];
	let outstandingInvites: (ClaimEndorsement & { creator: User })[] = [];
	let inviteCount: number | undefined = undefined;
	let category: 'AchievementClaim' | 'ClaimEndorsement' = 'AchievementClaim';
	let loading = true;
	let deleteModalVisible = false;
	let inviteToDelete: (ClaimEndorsement & { creator: User }) | null = null;

	const session: App.SessionData | undefined = getContext('session');
	const achievementId: string = getContext('achievementId');

	const getFetchUrl = (pageToFetch: number) => {
		if (category == 'AchievementClaim')
			return `/api/v1/achievementClaims?achievementId=${achievementId}&${PAGE_QUERY_PARAM}=${pageToFetch}&${PAGE_SIZE_QUERY_PARAM}=${pageSize}`;
		return `/api/v1/achievements/${achievementId}/invites?${PAGE_QUERY_PARAM}=${pageToFetch}&${PAGE_SIZE_QUERY_PARAM}=${pageSize}&includeCount=${
			inviteCount === undefined
		}`;
	};

	const getData = async (pageToFetch: number) => {
		loading = true;
		const res = await fetch(getFetchUrl(pageToFetch));
		if (!res.ok) {
			try {
				const errorBody = await res.json();
				notifications.add(new Notification(errorBody.message, false, 'error'));
			} catch {
				notifications.add(new Notification('Error fetching data.', false, 'error'));
			}
			return;
		}
		const responseJson = await res.json();
		({ page, pageSize } = responseJson.meta);
		if (category == 'AchievementClaim') claims = responseJson.data;
		else {
			outstandingInvites = responseJson.data;
			if (responseJson.meta?.totalCount) inviteCount = responseJson.meta.totalCount;
		}
		loading = false;
	};

	const setTab = (tab: 'AchievementClaim' | 'ClaimEndorsement') => {
		if (category == tab) return;
		category = tab;
		getData(1);
	};

	const tabItems = [
		{
			id: 'AchievementClaim',
			name: m.cuddly_antsy_rabbit_cook(),
			onClick: () => {
				setTab('AchievementClaim');
			}
		},
		{
			id: 'ClaimEndorsement',
			name: m.petty_tidy_pug_file(),
			onClick: () => {
				setTab('ClaimEndorsement');
			}
		}
	];

	const showDeleteModal = (invite: ClaimEndorsement & { creator: User }) => {
		inviteToDelete = invite;
		deleteModalVisible = true;
	};

	const closeDeleteModal = () => {
		deleteModalVisible = false;
		inviteToDelete = null;
	};

	const deleteInvite = async () => {
		if (!inviteToDelete) return;

		try {
			const res = await fetch(
				`/api/v1/achievements/${achievementId}/invites/${inviteToDelete.id}`,
				{
					method: 'DELETE'
				}
			);

			if (!res.ok) {
				const errorBody = await res.json();
				notifications.add(
					new Notification(errorBody.message || m.bad_ok_jackdaw_link(), false, 'error')
				);
				return;
			}

			notifications.add(new Notification(m.frail_kind_mule_enchant(), true, 'success'));
			// Refresh the data after successful deletion
			getData(page);
		} catch (err) {
			notifications.add(new Notification(m.bad_ok_jackdaw_link(), false, 'error'));
		} finally {
			closeDeleteModal();
		}
	};

	onMount(() => {
		if (totalCount === 0) {
			loading = false;
			return;
		}
		getData(page);
	});
</script>

{#if loading}
	<LoadingSpinner />
{:else}
	<div>
		<div class="flex justify-between">
			<div
				class="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700"
			>
				{#if enableInvites}
					<Tabs items={tabItems} currentItemId={category} />
				{/if}
			</div>
			<Pagination
				paging={{
					page,
					count: category == 'AchievementClaim' ? totalCount : inviteCount ?? 0,
					pageSize,
					action: getData
				}}
			/>
		</div>
		{#if category == 'AchievementClaim'}
			<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
				<thead
					class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
				>
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
					{#if !totalCount}
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 w-full">
							<td colspan="4" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
								{m.achievement_badgesClaimed_noneAvailable()}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		{/if}
		{#if category == 'ClaimEndorsement'}
			<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
				<thead
					class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
				>
					<tr>
						<th scope="col" class="px-6 py-3"> {m.tiny_stout_turtle_ask()} </th>
						<th scope="col" class="px-6 py-3"> {m.sleek_true_oryx_spin()} </th>
						<th scope="col" class="px-6 py-3"> {m.bad_bold_shrimp_express()} </th>
						<th scope="col" class="px-6 py-3"> {m.action_other()} </th>
					</tr>
				</thead>
				<tbody>
					{#each outstandingInvites || [] as invite (invite.id)}
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
							<th
								scope="row"
								class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
							>
								{invite.inviteeEmail}
							</th>
							<td class="px-6 py-4">
								{#if invite.creator}
									<a href="/members/{invite.creatorId}" class="hover:underline">
										{invite.creator?.givenName ?? ''}
										{invite.creator?.familyName ?? ''}
									</a>
								{/if}
								{#if session?.user?.id == invite.creatorId}({m.me()}){/if}
								{#if !invite.creator}N/A{/if}
							</td>
							<td class="px-6 py-4">
								{invite.createdAt}
							</td>
							<td class="px-6 py-4">
								{#if session?.user?.id === invite.creatorId || ['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(session?.user?.orgRole || 'none')}
									<IconButton
										id="trash-button"
										src={FaSolidTrash}
										text={m.wide_acidic_racoon_read()}
										size="16"
										on:click={() => showDeleteModal(invite)}
									/>
								{/if}
							</td>
						</tr>
					{/each}
					{#if !outstandingInvites.length}
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 w-full">
							<td colspan="4" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
								{m.mellow_sea_hound_jest()}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		{/if}
	</div>
{/if}

<!-- Delete confirmation modal -->
<Modal
	visible={deleteModalVisible}
	title={m.calm_weird_robin_startle()}
	on:close={closeDeleteModal}
	actions={[
		{
			label: m.calm_steady_lynx_cancel(),
			submodule: 'secondary',
			onClick: closeDeleteModal
		},
		{
			label: m.firm_steady_boar_delete(),
			submodule: 'danger',
			onClick: deleteInvite
		}
	]}
>
	<p>
		{m.shy_dry_dingo_emerge()} <strong>{inviteToDelete?.inviteeEmail}</strong>?
	</p>
	<p class="text-sm text-gray-500 mt-2">
		{m.curly_early_mouse_feel()}
	</p>
</Modal>
