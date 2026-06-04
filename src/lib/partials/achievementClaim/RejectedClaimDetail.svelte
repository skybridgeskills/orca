<script lang="ts">
	import type { Achievement, AchievementCategory, AchievementClaim } from '@prisma/client';

	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import * as m from '$lib/i18n/messages';
	import ClaimForm from '$lib/partials/achievementClaim/ClaimForm.svelte';

	interface Props {
		achievement: Achievement & {
			category?: AchievementCategory | null;
			achievementConfig?: App.ConfigWithRelations | null;
		};
		existingBadgeClaim: AchievementClaim | undefined;
	}

	let { achievement, existingBadgeClaim }: Props = $props();

	let showClaimForm = $state(false);
</script>

<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">{m.petty_plane_marten_view()}</h1>

<Alert level="warning" message={m.piquant_curly_mantis_tickle()} />

<AchievementSummary {achievement} />
{#if !showClaimForm}
	<div class="max-w-2xl flex justify-between items-center mt-4">
		<h2 class="text-l sm:text-xl my-4 dark:text-white">{m.petty_plane_marten_view()}</h2>
		<div>
			<Button
				text="Change acceptance"
				onclick={() => {
					showClaimForm = true;
				}}
			/>
		</div>
	</div>
	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{m.wet_dark_mole_fry()}
	</p>
{:else}
	<h2 class="text-l sm:text-xl mt-8 mb-4 dark:text-white">
		{m.warm_stout_crossbill_ascend()}
	</h2>
{/if}

{#if showClaimForm}
	<ClaimForm
		{achievement}
		achievementConfig={achievement.achievementConfig}
		{existingBadgeClaim}
		claimIntent="ACCEPTED"
		handleCancel={() => {
			showClaimForm = false;
		}}
	/>
{/if}
