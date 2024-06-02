<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type {
		Achievement,
		AchievementCategory,
		AchievementConfig,
		AchievementClaim
	} from '@prisma/client';
	import Button from '$lib/components/Button.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';

	import ClaimForm from '$lib/partials/achievementClaim/ClaimForm.svelte';
	export let achievement: Achievement & {
		category: AchievementCategory | null;
		achievementConfig:
			| (AchievementConfig & {
					claimRequires: Achievement | null;
					reviewRequires: Achievement | null;
			  })
			| null;
	};
	export let existingBadgeClaim: AchievementClaim | undefined;
	let claimIntent: 'ACCEPTED' | 'REJECTED' | 'UNACCEPTED' = 'ACCEPTED';
	let showClaimForm = false;
</script>

<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">{m.claim_claimBadgeCTA()}</h1>

<p class="max-w-2xl mt-4 text-sm text-gray-500 dark:text-gray-400">
	{m.claim_statusInvited_description()}
</p>

<AchievementSummary {achievement} />

<div class="max-w-2xl flex justify-between items-center mt-4">
	<h2 class="text-l sm:text-xl my-4 dark:text-white">{m.claim_statusInvited()}</h2>
	<div>
		{#if !showClaimForm}
			<Button
				text="Reject"
				on:click={() => {
					claimIntent = 'REJECTED';
					showClaimForm = true;
				}}
			/>
			<Button
				text="Accept"
				on:click={() => {
					claimIntent = 'ACCEPTED';
					showClaimForm = true;
				}}
			/>
		{/if}
	</div>
</div>
<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
	{m.claim_statusInvitedFull_description({
		createdOn: existingBadgeClaim?.createdOn.toString() ?? ''
	})}
</p>

{#if showClaimForm}
	<ClaimForm
		{achievement}
		achievementConfig={achievement.achievementConfig}
		{existingBadgeClaim}
		{claimIntent}
		handleCancel={() => {
			showClaimForm = false;
		}}
	/>
{/if}
