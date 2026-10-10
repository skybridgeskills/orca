<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Button from '$lib/components/Button.svelte';
	import EvidenceItem from '$lib/components/EvidenceItem.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import { notifications, Notification } from '$lib/stores/notificationStore';
	import { evidenceItem } from '$lib/utils/evidenceItem';

	export let data: PageData;

	let deleteModalVisible = false;

	const breadcrumbItems = [
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: m.antsy_grand_rabbit_gaze(), href: '/achievements' },
		{ text: data.achievement.name, href: `/achievements/${data.achievement.id}` },
		{ text: data.invite.inviteeEmail }
	];

	const closeDeleteModal = () => {
		deleteModalVisible = false;
	};

	const deleteInvite = async () => {
		try {
			const res = await fetch(
				`/api/v1/achievements/${data.achievement.id}/invites/${data.invite.id}`,
				{ method: 'DELETE' }
			);

			if (!res.ok) {
				const errorBody = await res.json().catch(() => null);
				notifications.add(
					new Notification(errorBody?.message || m.bad_ok_jackdaw_link(), false, 'error')
				);
				return;
			}

			notifications.add(new Notification(m.frail_kind_mule_enchant(), true, 'success'));
			closeDeleteModal();
			await goto(`/achievements/${data.achievement.id}`);
		} catch {
			notifications.add(new Notification(m.bad_ok_jackdaw_link(), false, 'error'));
		}
	};
</script>

<Breadcrumbs items={breadcrumbItems} />

<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
	{data.invite.inviteeEmail}
</h1>

<p class="max-w-2xl mb-4 text-sm text-gray-500 dark:text-gray-400">
	{m.great_swift_penguin_link({ inviteeEmail: data.invite.inviteeEmail })}
</p>

<AchievementSummary achievement={data.achievement} />

<div class="max-w-2xl my-6">
	<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
		<span class="font-bold">{m.sharp_silly_hound_dart()}:</span>
		{data.invite.createdAt}
	</p>

	<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
		<span class="font-bold">{m.sleek_true_oryx_spin()}:</span>
		{#if data.invite.creator}
			<a href="/members/{data.invite.creatorId}" class="text-blue-700 hover:underline">
				{data.invite.creator.givenName ?? ''}
				{data.invite.creator.familyName ?? ''}
			</a>
		{:else}
			N/A
		{/if}
	</p>

	<EvidenceItem item={evidenceItem(data.invite)} />

	<Alert level="info">
		<p class="max-w-2xl text-sm">
			{m.calm_warm_otter_invitepending()}
		</p>
	</Alert>
</div>

<div class="max-w-2xl flex gap-2">
	<Button href="/achievements/{data.achievement.id}" submodule="secondary" text="Done" />
	{#if data.canDelete}
		<Button
			submodule="danger"
			text={m.wide_acidic_racoon_read()}
			on:click={() => {
				deleteModalVisible = true;
			}}
		/>
	{/if}
</div>

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
		{m.shy_dry_dingo_emerge()} <strong>{data.invite.inviteeEmail}</strong>?
	</p>
	<p class="text-sm text-gray-500 mt-2">
		{m.curly_early_mouse_feel()}
	</p>
</Modal>
