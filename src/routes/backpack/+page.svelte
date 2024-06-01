<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
	import Icon from 'svelte-icons-pack/Icon.svelte';
	import FaShareSquare from 'svelte-icons-pack/fa/FaShareSquare.js';
	import FaSolidInfoCircle from 'svelte-icons-pack/fa/FaSolidInfoCircle.js';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime.js';
	import Alert from '$lib/components/Alert.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { PageData } from './$types';
	import EmptyStateZone from '$lib/components/EmptyStateZone.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Backpack from '$lib/illustrations/Backpack.svelte';
	import RightArrow from '$lib/illustrations/RightArrow.svelte';
	import type { Achievement, AchievementClaim } from '@prisma/client';
	import Modal from '$lib/components/Modal.svelte';
	import { linkedInShareUrl } from '$lib/utils/shareCredentials';
	import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
	import Pagination from '$lib/components/Pagination.svelte';
	import { calculatePageAndSize } from '$lib/utils/pagination';
	import {
		backpackClaims,
		backpackClaimsLoading,
		fetchBackpackClaims,
		outstandingInvites,
		outstandingInvitesLoading,
		fetchOutstandingInvites
	} from '$lib/stores/backpackStore';
	import { LoadingStatus, ensureLoaded } from '$lib/stores/common';
	import { onMount } from 'svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import {
		achievements,
		achievementsLoading,
		fetchAchievements,
		getAchievementById
	} from '$lib/stores/achievementStore';

	dayjs.extend(relativeTime);
	export let data: PageData;
	let { page: currentPageNum, pageSize } = calculatePageAndSize($page.url);
	$: currentPageData = $backpackClaims.slice(
		(currentPageNum - 1) * pageSize,
		currentPageNum * pageSize
	);

	let currentShareIntent: (AchievementClaim & { achievement: Achievement }) | null = null;

	const breadcrumbItems = [{ text: m.home(), href: '/' }, { text: m.backpack() }];

	const handleShare = (claim: AchievementClaim & { achievement: Achievement }) => {
		if (navigator.share) {
			navigator.share({
				title: claim.achievement.name,
				text: `${m.claim_shareText_heading({ name: claim.achievement.name })} 
				
				${claim.achievement.description}`,
				url: `${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/ob2/a/${claim.id}`
			});
		} else {
			currentShareIntent = claim;
			document.getElementById('share-modal')?.focus();
		}
	};
	const handleCopyToClipboard = (
		claim: (AchievementClaim & { achievement: Achievement }) | null
	) => {
		if (!claim || !navigator.clipboard) return;
		navigator.clipboard.writeText(`${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/ob2/a/${claim.id}`);
	};

	onMount(async () => {
		await Promise.all([
			ensureLoaded($backpackClaims, fetchBackpackClaims, backpackClaimsLoading),
			ensureLoaded($outstandingInvites, fetchOutstandingInvites, outstandingInvitesLoading),
			ensureLoaded($achievements, fetchAchievements, achievementsLoading)
		]);
	});
</script>

<Breadcrumbs items={breadcrumbItems} />

<Heading
	title={m.backpack_yourBadges_heading()}
	level="h1"
	description={m.backpack_yourBadges_description()}
/>

{#if [LoadingStatus.NotStarted, LoadingStatus.Loading].includes($backpackClaimsLoading)}
	<LoadingSpinner />
{/if}
{#each data.outstandingInvites as invite}
	<div class="my-2">
		<Alert>
			{m.status_invited_description()}
			<a
				href={`/achievements/${invite.achievementId}/claim?i=${invite.id}&e=${encodeURIComponent(
					invite.inviteeEmail
				)}`}
				class="font-bold underline hover:no-underline"
				>{invite.achievement.name}
			</a>
		</Alert>
	</div>
{/each}

<Pagination
	paging={{
		page: currentPageNum,
		pageSize,
		count: $backpackClaims.length,
		action: (p) => {
			currentPageNum = p;
		}
	}}
/>
{#each currentPageData as claim (claim.id)}
	{@const achievement = getAchievementById(claim.achievementId)}
	{#if achievement}
		<div class="mb-4">
			<AchievementSummary
				{claim}
				{achievement}
				isClickable={true}
				href={`/claims/${claim.id}`}
				linkAchievement={false}
			>
				<div slot="moredescription">
					<p class="text-sm md:text-md font-light text-gray-500 dark:text-gray-400">
						{m.claimed()}
						{dayjs(claim.createdOn).fromNow()}
					</p>
				</div>
				<div slot="actions">
					{#if claim.claimStatus === 'ACCEPTED' && claim.validFrom}
						<div class="p-2 flex flex-row space-x-3">
							<a
								class="icon text-gray-600 hover:text-blue-600 w-4 h-4 cursor-pointer"
								tabindex="0"
								href={`/claims/${claim.id}`}
							>
								<span class="sr-only">View details</span>
								<Icon src={FaSolidInfoCircle} size="20" color="currentColor" />
							</a>
							<button
								class="icon text-gray-600 hover:text-blue-600 w-4 h-4 cursor-pointer"
								tabindex="0"
								on:click={(e) => {
									handleShare({ ...claim, achievement });
									e.preventDefault();
									e.stopPropagation();
								}}
								on:keypress={(e) => {
									handleShare({ ...claim, achievement });
									e.preventDefault();
									e.stopPropagation();
								}}
							>
								<span class="sr-only">{m.share()}</span>
								<Icon src={FaShareSquare} size="20" color="currentColor" />
							</button>
						</div>
					{/if}
				</div>
			</AchievementSummary>
		</div>
	{/if}
{:else}
	<EmptyStateZone title="You haven't claimed any badges yet.">
		<Backpack slot="image" />
		<p slot="description">
			{m.backpack_emptyState_description()}
			<br /><a href="/achievements" class="font-bold underline hover:no-underline"
				>{m.backpack_emptyStateCTA()}</a
			>.
		</p>
	</EmptyStateZone>
{/each}

<Modal
	id="share-modal"
	title="Share your {currentShareIntent?.achievement.name} badge"
	visible={!!currentShareIntent}
	on:close={() => {
		currentShareIntent = null;
	}}
	actions={[]}
>
	<p class="max-w-2xl mb-4 lg:mb-8 text-gray-500 text-sm md:text-md dark:text-gray-400">
		{m.share_description()}
	</p>
	<div class="flex mb-3 w-full">
		<span
			class="inline-flex items-center p-2 text-sm text-gray-900 bg-gray-50 rounded-l border border-r-0 border-gray-300"
			>{`${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/ob2/a/${currentShareIntent?.id}`}</span
		>
		<button
			class="rounded-none rounded-r bg-gray-50 p-2 mr-3 border border-gray-300 text-gray-700 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm cursor-pointer"
			on:click={() => {
				handleCopyToClipboard(currentShareIntent);
			}}
			on:keypress={() => {
				handleCopyToClipboard(currentShareIntent);
			}}
		>
			{m.copyCTA()}
		</button>
	</div>
	{#if currentShareIntent && currentShareIntent?.achievement}
		<a
			href={linkedInShareUrl({
				...currentShareIntent,
				achievement: { ...currentShareIntent.achievement, organization: data.org }
			}).toString()}
			target={`linkedin-${currentShareIntent.achievement.id}`}
			rel="noopener noreferrer"
			class="flex items-center focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 focus-visible:outline-none"
			><img src="/linkedin-add-to-profile-button.png" alt="LinkedIn Add to Profile button" /></a
		>{/if}
</Modal>
