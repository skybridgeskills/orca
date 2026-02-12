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

	const levelByStatus: Record<string, App.NotificationLevel> = {
		UNACCEPTED: 'warning',
		REJECTED: 'warning',
		ACCEPTED: 'info'
	};

	const breadcrumbItems = [
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: data.achievement.name, href: `../achievements/${data.achievement.id}` },
		{ text: `${data.claim.user.givenName} ${data.claim.user.familyName}` }
	];

	setContext('claimId', data.claim.id);

	$: translatedStatus = (() => {
		switch (data.claim.claimStatus) {
			case 'ACCEPTED':
				return m.bright_swift_eagle_soar();
			case 'REJECTED':
				return m.sharp_clear_fox_deny();
			case 'UNACCEPTED':
				return m.calm_steady_lynx_pause();
			default:
				return data.claim.claimStatus; // fallback to raw value
		}
	})();
</script>

<Breadcrumbs items={breadcrumbItems} />

{#if data.session?.user?.id == data.claim.userId}
	{#if data.claim.claimStatus == 'ACCEPTED'}
		<AcceptedClaimDetail
			achievement={{ ...data.achievement, organization: data.org, category: null }}
			existingBadgeClaim={data.claim}
		/>
	{:else if data.claim.claimStatus == 'REJECTED'}
		<RejectedClaimDetail achievement={data.achievement} existingBadgeClaim={data.claim} />
	{:else if data.claim.claimStatus == 'UNACCEPTED'}
		<UnacceptedClaimDetail achievement={data.achievement} existingBadgeClaim={data.claim} />
	{/if}
{:else}
	<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
		{m.quick_clear_owl_otherbadge({
			givenName: data.claim.user.givenName ?? '',
			familyName: data.claim.user.familyName ?? ''
		})}
	</h1>

	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{m.smooth_calm_guppy_ask()}
	</p>
	<AchievementSummary achievement={data.achievement} />
{/if}

{#if data.claim.userId != data.session?.user?.id}
	<div class="max-w-2xl my-6">
		<ActionHeading
			text={m.swift_bold_eagle_announce({
				givenName: data.claim.user.givenName ?? '',
				familyName: data.claim.user.familyName ?? ''
			})}
		>
			<span slot="actions" class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400"
				>{data.claim.createdOn.toDateString()}</span
			>
		</ActionHeading>

		<EvidenceItem item={evidenceItem(data.claim)} />

		<Alert level={levelByStatus[data.claim.claimStatus]}>
			<p class="max-w-2xl text-sm">
				<span class="font-bold">{m.kind_aqua_myna_jump()}</span>
				{translatedStatus}
			</p>
			{#if data.claim.validFrom}
				<p class="max-w-2xl mt-3 text-sm">
					<span>{m.cuddly_fluffy_kite_drip()}:</span>
					{data.claim.validFrom}
				</p>
			{/if}
			{#if data.claim.validUntil}
				<p class="max-w-2xl mt-3 text-sm">
					<span>{m.tidy_fresh_seahorse_march()}:</span>
					{data.claim.validUntil}
				</p>
			{/if}
		</Alert>
	</div>
{/if}

<div class="max-w-2xl mt-2">
	<ActionHeading text={m.calm_steady_lynx_endorse({ count: data.endorsementCount })}>
		<span slot="actions">
			{#if data.hasProvidedEndorsement}
				<a href={`${data.claim.id}/endorse`}><Button text={m.antsy_slow_robin_persuade()} /></a>
			{:else if data.session?.user?.id != data.claim.userId}
				<a href={`${data.claim.id}/endorse`}><Button text={m.bright_gentle_cheetah_shrine()} /></a>
			{/if}
		</span>
	</ActionHeading>

	{#if data.claim.validFrom && !data.achievement.achievementConfig?.reviewsRequired}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.shy_male_thrush_jump()}
		</p>
	{:else if data.claim.validFrom && data.achievement.achievementConfig?.reviewsRequired}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.funny_piquant_guppy_deny()}
		</p>
	{:else if data.achievement.achievementConfig?.reviewsRequired && data.achievement.achievementConfig?.reviewRequires}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.curly_quiet_mantis_express({
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
