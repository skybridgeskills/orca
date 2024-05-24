<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime.js';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Button from '$lib/components/Button.svelte';
	import Ribbon from '$lib/illustrations/Ribbon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import type { PageData } from './$types';
	import Icon from 'svelte-icons-pack/Icon.svelte';
	import FaSolidEnvelopeOpenText from 'svelte-icons-pack/fa/FaSolidEnvelopeOpenText.js';
	import FaSolidInfoCircle from 'svelte-icons-pack/fa/FaSolidInfoCircle.js';
	import FaTrashAlt from 'svelte-icons-pack/fa/FaTrashAlt.js';
	import AchievementCriteria from '$lib/partials/achievement/AchievementCriteria.svelte';
	import { imageUrl } from '$lib/utils/imageUrl';
	import ClaimSummaryCard from '$lib/components/achievement/ClaimSummaryCard.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import type {
		Achievement,
		AchievementClaim,
		AchievementConfig,
		ClaimEndorsement,
		User
	} from '@prisma/client';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import { getCategoryById } from '$lib/stores/achievementStore';
	import ClaimList from '$lib/components/achievement/ClaimList.svelte';
	import { setContext } from 'svelte';
	import { calculatePageAndSize } from '$lib/utils/pagination';
	import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

	dayjs.extend(relativeTime);

	export let data: PageData;
	let showDeleteModal = false;
	let showShareModal = false;

	const breadcrumbItems = [
		{ text: 'Home', href: '/' },
		{ text: 'Achievements', href: '/achievements' },
		{ text: data.achievement.name }
	];

	let config: AchievementConfig | null = null;
	let claim: AchievementClaim | undefined;
	let userHoldsRequiredAchievement = false;
	let reviewRequires: Achievement | undefined;
	let invite: (ClaimEndorsement & { creator: User | null }) | undefined;
	$: {
		config = data.achievement.achievementConfig;
		claim = data.relatedClaims.find((c) => data.achievement.id == c.achievementId);
		userHoldsRequiredAchievement =
			data.relatedClaims.filter((c) => c.achievementId == config?.claimRequiresId).length > 0;

		reviewRequires = data.relatedAchievements
			.filter((c) => data.achievement.achievementConfig?.reviewRequiresId == c.id)
			.find(() => true);

		invite = data.outstandingInvites.find((a) => true);
	}

	setContext('achievementId', data.achievement.id);
	setContext('session', data.session);
</script>

<Breadcrumbs items={breadcrumbItems} />

<div class="max-w-2xl flex justify-between items-center mb-4">
	<h1 class="inline-flex mt-1 mr-3 text-xl sm:text-2xl text-gray-800 dark:text-white">
		{data.achievement.name}
	</h1>
	<div class="inline-flex items-center">
		{#if data.editAchievementCapability}
			<Button href={`/achievements/${data.achievement.id}/award`} text={m.awardCTA()} />
			<Button
				href={`/achievements/${data.achievement.id}/edit`}
				submodule="secondary"
				text={m.editCTA()}
			/>
			<Button
				submodule="danger"
				on:click={() => {
					showDeleteModal = true;
				}}
			>
				<span class="sr-only">{m.deleteCTA()}</span>
				<div class="h-4 w-4">
					<Icon src={FaTrashAlt} size="16" color="currentColor" />
				</div>
			</Button>
		{/if}
		<Button
			text={m.share()}
			submodule="secondary"
			on:click={() => {
				showShareModal = true;
			}}
		/>
		{#if config?.claimable && (config.claimRequiresId == null || userHoldsRequiredAchievement)}
			<Button
				href={invite
					? `/achievements/${invite.achievementId}/claim?i=${invite.id}&e=${encodeURIComponent(
							invite.inviteeEmail
					  )}`
					: `/achievements/${data.achievement.id}/claim`}
				text={m.claimCTA()}
				submodule="primary"
			/>
		{/if}
	</div>
</div>

{#if data.achievement.categoryId}
	<span
		class="bg-gray-100 text-gray-800 text-md font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300"
		>{m.category()}: {getCategoryById(data.achievement.categoryId)?.name}</span
	>
{/if}

<div class="mb-4 max-w-xs dark:bg-gray-200 mt-4 p-2 rounded-md">
	{#if data.achievement.image}
		<img
			src={imageUrl(data.achievement.image)}
			alt={m.achievementImageAltText({ name: data.achievement.name })}
		/>
	{:else}
		<div class="text-gray-400 dark:text-gray-700">
			<Ribbon />
		</div>
	{/if}
</div>

<p class="max-w-2xl mt-1 text-sm text-gray-500 dark:text-gray-400">
	{data.achievement.description}
</p>

<div class="mt-4 max-w-2xl">
	{#if claim && claim?.claimStatus !== 'UNACCEPTED'}
		<!-- C1: User has a claim for this achievement. It may be under review, accepted, rejected -->
		<ClaimSummaryCard {claim} achievement={data.achievement} org={data.org} />
	{:else if invite || claim?.claimStatus == 'UNACCEPTED'}
		<!-- C2: User does not have a claim, but has an invitation to claim (when a user existed at time of invite, this is represented by a claim with status unaccepted) -->
		<AchievementSummary
			achievement={{ ...data.achievement, name: m.status_invited_medium(), description: '' }}
		>
			<div slot="moredescription">
				<p class="text-sm md:text-md font-light text-gray-500 dark:text-gray-400">
					{m.status_invited_description()}
					{#if invite}
						{m.achievement_invitedByNameAtTime({
							givenName: invite?.creator?.givenName ?? '',
							familyName: invite?.creator?.familyName ?? '',
							timeAgo: dayjs(invite.createdAt).fromNow()
						})}
					{/if}
				</p>
			</div>
			<div slot="image">
				<div class="text-blue-600 dark:text-blue-700 w-10">
					<Icon src={FaSolidEnvelopeOpenText} size="40" color="currentColor" />
				</div>
			</div>
			<div slot="actions">
				<div class="p-2 flex flex-row space-x-3">
					<a
						class="text-gray-600 w-4 h-4 cursor-pointer"
						href={invite
							? `/achievements/${data.achievement.id}/claim?i=${invite?.id}&e=${encodeURIComponent(
									invite?.inviteeEmail
							  )}`
							: `/achievements/${data.achievement.id}/claim`}
					>
						<span class="sr-only">{m.claimCTA()}</span>
						<Icon src={FaSolidInfoCircle} size="20" color="currentColor" />
					</a>
				</div>
			</div>
		</AchievementSummary>
	{/if}
</div>

<!-- Claim Rules -->
<div class="mt-4 max-w-2xl">
	<Heading title={m.claimConfiguration_heading()} level="h3">
		{#if !config?.claimable}
			<!-- A1: Achievement is not claimable -->
			{m.claimConfiguration_claimDisabled()}
			{m.claimConfiguration_adminOnly_description()}
		{:else if config?.claimRequiresId}
			<!-- A2: Achievement is claimable, and requires a prerequisite -->
			{#each data.relatedAchievements.filter((a) => config?.claimRequiresId == a.id) as claimRequires}
				{m.claimConfiguration_claimRequiresSummary()}
				<a
					href={`/achievements/${claimRequires.id}`}
					class="font-bold underline hover:no-underline"
				>
					{claimRequires.name}</a
				>{#if userHoldsRequiredAchievement}. {m.claimConfiguration_userMeetsRequirement()}
				{:else}
					{m.claimConfiguration_userNotMeetsRequirement()}
				{/if}
			{/each}
		{:else}
			<span class="text-gray-500 dark:text-gray-400">
				{m.achievement_openClaimable_description()}
			</span>
		{/if}

		{#if reviewRequires && !!config?.reviewsRequired}
			{m.claimConfiguration_reviewsRequiredSummary({
				reviewsRequired: config?.reviewsRequired ?? 0
			})}
			<a
				href={`/achievements/${reviewRequires?.id}`}
				class="font-bold underline hover:no-underline"
			>
				{reviewRequires.name}</a
			>.
		{:else}
			{m.claimConfiguration_noReviewsRequired_description()}
		{/if}
	</Heading>
</div>

<!-- Criteria -->
<div class="my-4 max-w-2xl">
	<AchievementCriteria achievement={data.achievement} />
</div>

<!-- Existing community claims -->
<Heading
	title={m.achievement_badgesClaimed_heading()}
	level="h3"
	description={`${m.achievement_claimCountSummary({
		count: data.achievement._count.achievementClaims
	})}`}
/>

{#if data.achievement._count.achievementClaims > 0}
	{#if data.session?.user}
		<div class="relative overflow-x-auto">
			<ClaimList
				data={{
					...calculatePageAndSize($page.url),
					total: data.achievement._count.achievementClaims
				}}
			/>
		</div>
	{:else}
		<div class="mb-4 text-sm text-gray-500 dark:text-gray-400">
			{m.achievement_badgesClaimed_loginCTA_description()}
		</div>
	{/if}
{:else}
	<div class="mb-4 text-sm text-gray-500 dark:text-gray-400">
		{m.achievement_badgesClaimed_noneAvailable()}
	</div>
{/if}

<form id="deleteForm" action="?/delete" method="POST" />

<Modal
	visible={showDeleteModal}
	title={m.achievement_deleteConfirm_heading()}
	on:close={() => {
		showDeleteModal = false;
	}}
	actions={[
		{
			label: m.cancelCTA(),
			buttonType: 'button',
			submodule: 'secondary',
			onClick: () => {
				showDeleteModal = false;
			}
		},
		{
			label: m.deleteCTA(),
			buttonType: 'button',
			submodule: 'danger',
			onClick: () => {
				const deleteForm = document.getElementById('deleteForm');
				if (deleteForm instanceof HTMLFormElement) deleteForm.submit();
				showDeleteModal = false;
			}
		}
	]}
>
	<p class="text-sm text-gray-500 dark:text-gray-400 max-w-prose">
		{m.achievement_deleteConfirm_description({
			name: data.achievement.name,
			count: data.achievement._count.achievementClaims
		})}
	</p>
</Modal>

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
				if (!data.achievement || !navigator.clipboard) {
					return;
				}
				const url = `${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/achievements/${data.achievement.id}`;
				navigator.clipboard.writeText(url);
				console.log(m.claim_shareUrlCopied() + url);
				e.preventDefault();
				e.stopPropagation();
			}
		}
	]}
>
	<p class="text-sm text-gray-500 dark:text-gray-400">
		{m.achievement_share_description()}
	</p>
	<QRCode
		url={`${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/achievements/${data.achievement.id}`}
		alt={m.share_qrCodeImageAltText()}
	/>
</Modal>
