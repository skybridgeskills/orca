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

<Heading level="h1" title={`${m.fresh_bright_sparrow_earned()}: ${existingBadgeClaim.achievement.name}`} />

{#if existingBadgeClaim.claimStatus !== 'REJECTED'}
	<AchievementSummary achievement={existingBadgeClaim.achievement} claim={existingBadgeClaim} />

	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{existingBadgeClaim.claimStatus === 'ACCEPTED' ? m.claim_statusAcceptedPublic() : ''}
		{existingBadgeClaim.claimStatus === 'UNACCEPTED' ? m.claim_statusUnacceptedPublic() : ''}
	</p>

	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{existingBadgeClaim.validFrom
			? `${m.claim_validFrom()}: ${existingBadgeClaim.validFrom}.`
			: m.status_notYetReviewed()}
		{existingBadgeClaim.validUntil
			? `${m.claim_validUntil()} ${existingBadgeClaim.validUntil}.`
			: ''}
	</p>
	<div class="my-2 max-w-2xl">
		<AchievementCriteria achievement={existingBadgeClaim.achievement} />
	</div>

	<AchievementClaimEvidence claim={existingBadgeClaim} />
{:else}
	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{m.claim_statusRejectedPublic_description()}
	</p>
{/if}
