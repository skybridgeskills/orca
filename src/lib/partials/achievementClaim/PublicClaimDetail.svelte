<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type {
		Achievement,
		AchievementCategory,
		AchievementClaim,
		Organization
	} from '@prisma/client';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import AchievementClaimEvidence from '$lib/partials/achievementClaim/AchievementClaimEvidence.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import AchievementCriteria from '../achievement/AchievementCriteria.svelte';

	export let existingBadgeClaim: AchievementClaim & {
		achievement: Achievement & {
			organization: Organization;
			category: AchievementCategory | null;
		};
	};
</script>

<Heading
	level="h1"
	title={`${m.fresh_bright_sparrow_earned()}: ${existingBadgeClaim.achievement.name}`}
/>

{#if existingBadgeClaim.claimStatus !== 'REJECTED'}
	<AchievementSummary achievement={existingBadgeClaim.achievement} claim={existingBadgeClaim} />

	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{existingBadgeClaim.claimStatus === 'ACCEPTED' ? m.factual_best_dolphin_nurture() : ''}
		{existingBadgeClaim.claimStatus === 'UNACCEPTED' ? m.cool_curly_panther_tickle() : ''}
	</p>

	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{existingBadgeClaim.validFrom
			? `${m.cuddly_fluffy_kite_drip()}: ${existingBadgeClaim.validFrom}.`
			: m.calm_quick_robin_drip()}
		{existingBadgeClaim.validUntil
			? `${m.tidy_fresh_seahorse_march()} ${existingBadgeClaim.validUntil}.`
			: ''}
	</p>
	<div class="my-2 max-w-2xl">
		<AchievementCriteria achievement={existingBadgeClaim.achievement} />
	</div>

	<AchievementClaimEvidence claim={existingBadgeClaim} />
{:else}
	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{m.moving_fresh_termite_visit()}
	</p>
{/if}
