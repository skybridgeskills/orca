<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import ClaimForm from '$lib/partials/achievementClaim/ClaimForm.svelte';
	import { claimEmail, claimId, inviteId } from '$lib/stores/activeClaimStore';

	export let data: PageData;

	onMount(() => {
		if (data.inviteId) $inviteId = data.inviteId;
		if (data.inviteeEmail) $claimEmail = data.inviteeEmail;
	});

	// initially show claim form if user is eligible to self-claim a fresh claim now.
	let claimIntent: 'ACCEPTED' | 'UNACCEPTED' | 'REJECTED' = 'ACCEPTED';

	const breadcrumbItems = [
		{ text: m.home(), href: '/' },
		{ text: m.achievement_other(), href: '/achievements' },
		{ text: data.achievement.name, href: `../${data.achievement.id}` },
		{ text: m.claimCTA() }
	];
</script>

<Breadcrumbs items={breadcrumbItems} />

{#if $inviteId || (data.achievement.achievementConfig?.claimable && data.achievement.achievementConfig?.claimRequiresId == null) || !!(data.achievement.achievementConfig?.claimRequiresId && data.requiredBadgeClaim?.id)}
	<AchievementSummary achievement={data.achievement} />
	<ClaimForm
		achievement={data.achievement}
		achievementConfig={data.achievement.achievementConfig}
		existingBadgeClaim={data.existingBadgeClaim}
		{claimIntent}
		handleCancel={() => {
			goto(`/achievements/${data.achievement.id}`);
		}}
	/>
{:else if data.achievement.achievementConfig?.claimable && data.achievement.achievementConfig?.claimRequiresId}
	<AchievementSummary achievement={data.achievement} />
	<div class="max-w-2xl mt-4">
		<h2 class="text-l sm:text-xl my-4 dark:text-white">
			{m.claimConfiguration_userNotMeetRequirement_heading()}
		</h2>

		<Alert level="warning">
			{m.claimConfiguration_claimRequiresSummary()}
			<a
				href={`/achievements/${data.achievement.achievementConfig?.claimRequiresId}`}
				class="font-bold underline hover:no-underline"
				>{data.achievement.achievementConfig?.claimRequires?.name}</a
			>. {m.claimConfiguration_userNotMeetsRequirement()}
		</Alert>
	</div>
{:else}
	<div class="max-w-2xl">
		<Alert
			level="error"
			message={`${m.claimConfiguration_claimDisabled()} ${m.claimConfiguration_adminOnly_description()}`}
		/>
	</div>
{/if}
