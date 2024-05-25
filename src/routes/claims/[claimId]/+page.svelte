<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { PageData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import EvidenceItem from '$lib/components/EvidenceItem.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import AcceptedClaimDetail from '$lib/partials/achievementClaim/AcceptedClaimDetail.svelte';
	import RejectedClaimDetail from '$lib/partials/achievementClaim/RejectedClaimDetail.svelte';
	import UnacceptedClaimDetail from '$lib/partials/achievementClaim/UnacceptedClaimDetail.svelte';
	import ActionHeading from '$lib/components/ActionHeading.svelte';
	import { evidenceItem } from '$lib/utils/evidenceItem';
	import { setContext } from 'svelte';
	import EndorsementList from '$lib/components/EndorsementList.svelte';
	import { calculatePageAndSize } from '$lib/utils/pagination';
	import { page } from '$app/stores';

	export let data: PageData;

	const levelByStatus = {
		UNACCEPTED: 'warning',
		REJECTED: 'warning',
		ACCEPTED: 'info'
	};

	const breadcrumbItems = [
		{ text: m.home(), href: '/' },
		{ text: data.achievement.name, href: `../achievements/${data.achievement.id}` },
		{ text: `${data.claim.user.givenName} ${data.claim.user.familyName}` }
	];

	setContext('claimId', data.claim.id);
</script>

<Breadcrumbs items={breadcrumbItems} />

{#if data.session?.user?.id == data.claim.userId}
	{#if data.claim.claimStatus == 'ACCEPTED'}
		<AcceptedClaimDetail
			achievement={{ ...data.achievement, organization: data.org }}
			existingBadgeClaim={data.claim}
		/>
	{:else if data.claim.claimStatus == 'REJECTED'}
		<RejectedClaimDetail achievement={data.achievement} existingBadgeClaim={data.claim} />
	{:else if data.claim.claimStatus == 'UNACCEPTED'}
		<UnacceptedClaimDetail achievement={data.achievement} existingBadgeClaim={data.claim} />
	{/if}
{:else}
	<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
		{m.otherUserBadge_heading({
			givenName: data.claim.user.givenName ?? '',
			familyName: data.claim.user.familyName ?? ''
		})}
	</h1>

	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{m.claim_claimedByAnonMember()}
	</p>
	<AchievementSummary achievement={data.achievement} />
{/if}

{#if data.claim.userId != data.session?.user?.id}
	<div class="max-w-2xl my-6">
		<ActionHeading
			text={`${data.claim.user.givenName} ${data.claim.user.familyName} claimed this badge`}
		>
			<span slot="actions" class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400"
				>{data.claim.createdOn.toDateString()}</span
			>
		</ActionHeading>

		<EvidenceItem item={evidenceItem(data.claim)} />

		<Alert level={levelByStatus[data.claim.claimStatus]}>
			<p class="max-w-2xl text-sm">
				<span class="font-bold">{m.acceptance()}</span>
				{data.claim.claimStatus}
			</p>
			{#if data.claim.validFrom}
				<p class="max-w-2xl mt-3 text-sm">
					<span>{m.claim_validFrom()}:</span>
					{data.claim.validFrom}
				</p>
			{/if}
			{#if data.claim.validUntil}
				<p class="max-w-2xl mt-3 text-sm">
					<span>{m.claim_validUntil()}:</span>
					{data.claim.validUntil}
				</p>
			{/if}
		</Alert>
	</div>
{/if}

<div class="max-w-2xl mt-2">
	<ActionHeading text={`${data.endorsementCount} endorsements`}>
		<span slot="actions">
			{#if data.hasProvidedEndorsement}
				<a href={`${data.claim.id}/endorse`}><Button text={m.endorsement_updateCTA()} /></a>
			{:else if data.session?.user?.id != data.claim.userId}
				<a href={`${data.claim.id}/endorse`}><Button text={m.endorsement_addYoursCTA()} /></a>
			{/if}
		</span>
	</ActionHeading>

	{#if data.claim.validFrom && !data.achievement.achievementConfig?.reviewsRequired}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.claim_statusValidNoReviewRequired()}
		</p>
	{:else if data.claim.validFrom && data.achievement.achievementConfig?.reviewsRequired}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.claim_statusValidSufficientReviews()}
		</p>
	{:else if data.achievement.achievementConfig?.reviewsRequired && data.achievement.achievementConfig?.reviewRequires}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.status_notYetReviewed_description({
				count: data.achievement.achievementConfig?.reviewsRequired
			})}
			<a
				href="/achievements/{data.achievement.achievementConfig.reviewRequires.id}"
				class="font-bold underline hover:no-underline"
				>{data.achievement.achievementConfig.reviewRequires.name}</a
			>.
		</p>
	{/if}

	{#if data.endorsementCount > 0}
		<EndorsementList data={{ ...calculatePageAndSize($page.url), total: data.endorsementCount }} />
	{/if}
</div>
