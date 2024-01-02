<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import Tag from '$lib/components/Tag.svelte';
	import { calculatePageAndSize } from '$lib/utils/pagination';
	import type { PageData } from './$types';
	import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

	export let data: PageData;
	let member = data.member;
	let showShareModal = false;
</script>

<div class="max-w-2xl flex justify-between items-center mb-4">
	<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
		{member.givenName}
		{member.familyName}
		{#if member.orgRole}
			<Tag>{m.adminRoleLabel()}</Tag>
		{/if}
	</h1>
	<div class="inline-flex items-center">
		{#if member.id == data.session?.user?.id}
			<Button
				text={m.share()}
				submodule="secondary"
				onClick={() => {
					showShareModal = true;
				}}
			/>
			<Button href={`/settings`} submodule="secondary" text={m.profile_editCTA()} />
		{/if}
	</div>
</div>
<p class="mt-1 mb-8 text-sm text-gray-500 dark:text-gray-400">
	{#if member.id == data.session?.user?.id}
		{m.member_yourProfileGreeting()}
	{:else}
		{m.member_otherUserProfileDescription()}
	{/if}
</p>

{#if member.identifiers.length}
	<h3 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
		{#if member.identifiers.length == 1}
			1 {m.identifierListLabel()}
		{:else}
			{member.identifiers.length} {m.identifierListLabel_other()}
		{/if}
	</h3>
	{#each member.identifiers as identifier}
		<p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
			{identifier.type}: {identifier.identifier}
			{#if identifier.verifiedAt}({m.status_verified()}){/if}
		</p>
	{/each}
{/if}

{#if member._count.receivedAchievementClaims}
	<h3 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
		{member._count.receivedAchievementClaims}
		{member._count.receivedAchievementClaims == 1 ? m.badge_one() : m.badge_other()}
	</h3>
	<Pagination
		paging={{ ...calculatePageAndSize($page.url), count: member._count.receivedAchievementClaims }}
	/>
	{#each member.receivedAchievementClaims as claim}
		<p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
			<a
				href={`/claims/${claim.id}`}
				class="text-blue-700 dark:text-blue-400 font-bold underline hover:no-underline"
				>{claim.achievement.name}</a
			>
		</p>
		<p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
			{m.status_created()}: {claim.createdOn}
		</p>
	{/each}
{/if}

{#if member.id == data.session?.user?.id}
	<Modal
		visible={showShareModal}
		title={m.share()}
		on:close={() => {
			showShareModal = false;
		}}
		actions={[
			{
				label: m.share_copyUrl(),
				buttonType: 'button',
				submodule: 'secondary',
				onClick: (e) => {
					if (!member || !navigator.clipboard) {
						return;
					}
					const url = `${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/members/${member.id}`;
					navigator.clipboard.writeText(url);
					console.log(m.claim_shareUrlCopied() + url);
					e.preventDefault();
					e.stopPropagation();
				}
			}
		]}
	>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{m.member_share_description()}
		</p>
		<QRCode
			url={`${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/members/${member.id}`}
			alt={m.share_qrCodeImageAltText()}
		/>
	</Modal>
{/if}
