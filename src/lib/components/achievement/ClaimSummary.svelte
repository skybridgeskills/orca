<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import type {
		Achievement,
		AchievementConfig,
		AchievementCategory,
		AchievementClaim,
		ClaimStatus
	} from '@prisma/client';

	export let achievement: Achievement & {
		category: AchievementCategory | null;
		achievementConfig: AchievementConfig | null;
	};
	export let relatedAchievements: Array<
		Achievement & {
			category: AchievementCategory | null;
			achievementConfig: AchievementConfig | null;
		}
	>;
	export let relatedClaims: AchievementClaim[];
	export let showClaimLink = false;

	const userHoldsAchievement = () =>
		relatedClaims.filter((c) => c.achievementId == achievement.id).length > 0;
	const userHoldsRequiredAchievement = () =>
		relatedClaims.filter((c) => c.achievementId == achievement.achievementConfig?.claimRequiresId)
			.length > 0;

	const reviewRequires = (): Achievement | undefined =>
		relatedAchievements.filter((c) => c.achievementConfig?.reviewRequiresId == achievement.id)[0];
</script>

{#if userHoldsAchievement()}
	<div class="mt-4">
		<Alert heading="Badge claimed:" message={m.merry_trite_seahorse_relish()}>
			{#each relatedClaims.filter((c) => c.achievementId == achievement.id) as claim (claim.id)}
				<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
					{m.date()}: {claim.createdOn}
				</p>
				<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
					{#if claim.claimStatus == 'UNACCEPTED'}
						{m.status_invited_description()}
						<a
							href={`/achievements/${achievement.id}/claim`}
							class="text-bold underline hover:no-underline">{m.claim_viewCTA()}</a
						>
					{:else if claim.claimStatus == 'ACCEPTED'}
						{m.claim_statusAccepted()}
						<a
							href={`/achievements/${achievement.id}/claim`}
							class="text-bold underline hover:no-underline">{m.claim_changeCTA()}</a
						>
					{:else}
						{m.status_rejected_description()}
						{#if showClaimLink}
							<a
								href={`/achievements/${achievement.id}/claim`}
								class="text-bold underline hover:no-underline">{m.claim_changeCTA()}</a
							>
						{/if}
					{/if}
				</p>
			{/each}
		</Alert>
	</div>
{:else if achievement.achievementConfig?.claimable && achievement.achievementConfig?.claimRequiresId}
	<div class="max-w-2xl flex justify-between items-center mt-4">
		<h2 class="text-l sm:text-xl my-4 dark:text-white">
			{#if userHoldsRequiredAchievement()}
				{m.achievement_claimCTA()}
			{:else}
				{m.status_prerequisiteRequired()}
			{/if}
		</h2>
		<div>
			{#if showClaimLink && userHoldsRequiredAchievement()}
				<a href={`/achievements/${achievement.id}/claim`}>
					<Button text={m.bold_swift_eagle_claim()} />
				</a>
			{/if}
		</div>
	</div>
	<p class="max-w-2xl mt-1 text-sm text-gray-500 dark:text-gray-400">
		{#each relatedAchievements.filter((rc) => achievement.achievementConfig?.claimRequiresId == rc.id) as claimRequires (claimRequires.id)}
			<span>
				{m.sharp_quiet_panther_requires()}
				<a
					href={`/achievements/${claimRequires.id}`}
					class="font-bold underline hover:no-underline"
				>
					{claimRequires.name}</a
				>{#if userHoldsRequiredAchievement()}. {m.swift_steady_falcon_meets()}
					{:else}
					{m.sharp_clear_fox_notmeets()}
				{/if}
			</span>
		{/each}
	</p>
{:else if achievement.achievementConfig?.claimable && !achievement.achievementConfig?.claimRequiresId}
	<div class="max-w-2xl flex justify-between items-center mt-4">
		<h2 class="text-l sm:text-xl my-4 dark:text-white">
			{#if $page.data.session?.user.id}
				{m.fresh_bright_sparrow_openclaim()}
			{:else}
				{m.quick_safe_deer_enabled()}
			{/if}
		</h2>
		<div>
			{#if showClaimLink}
				<a href={`/achievements/${achievement.id}/claim`}>
					<Button text="Claim" />
				</a>
			{/if}
		</div>
	</div>

	<p class="max-w-2xl mt-1 text-sm text-gray-500 dark:text-gray-400">
		{m.achievement_openClaimable_description()}
	</p>
{:else if !achievement.achievementConfig?.claimable || false}
	<h2 class="text-l sm:text-xl my-4 dark:text-white">{m.firm_clear_fox_disabled()}</h2>
	<p class="max-w-2xl mt-4 text-sm text-gray-500 dark:text-gray-400">
		{m.calm_steady_lynx_adminonly()}
	</p>
{/if}
