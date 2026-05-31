<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { Achievement, AchievementCategory, AchievementClaim } from '@prisma/client';
	import Button from '$lib/components/Button.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';

	import ClaimForm from '$lib/partials/achievementClaim/ClaimForm.svelte';

	interface Props {
		achievement: Achievement & {
			category?: AchievementCategory | null;
			achievementConfig?: App.ConfigWithRelations | null;
		};
		existingBadgeClaim: AchievementClaim | undefined;
	}

	let { achievement, existingBadgeClaim }: Props = $props();

	let claimIntent: 'ACCEPTED' | 'REJECTED' | 'UNACCEPTED' = $state('ACCEPTED');
	let showClaimForm = $state(false);
</script>

<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">{m.sharp_sea_panther_scold()}</h1>

<p class="max-w-2xl mt-4 text-sm text-gray-500 dark:text-gray-400">
	{m.ok_bold_oryx_drip()}
</p>

<AchievementSummary {achievement} />

<div class="max-w-2xl flex justify-between items-center mt-4">
	<h2 class="text-l sm:text-xl my-4 dark:text-white">{m.early_deft_pug_cherish()}</h2>
	<div class="flex justify">
		{#if !showClaimForm}
			<Button
				text={m.known_such_scallop_gaze()}
				submodule="danger"
				onclick={() => {
					claimIntent = 'REJECTED';
					showClaimForm = true;
				}}
			/>
			<Button
				text={m.proof_funny_dog_pat()}
				onclick={() => {
					claimIntent = 'ACCEPTED';
					showClaimForm = true;
				}}
			/>
		{/if}
	</div>
</div>
<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
	{m.grand_steady_panther_relish({
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
