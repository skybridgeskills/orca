<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { Achievement } from '@prisma/client';

	import AchievementSummary from './AchievementSummary.svelte';

	// Minimal stand-in for a Prisma Achievement; only name/description/image/id
	// are read by the component.
	const achievement = {
		id: 'demo-achievement',
		name: 'Open Recognition Champion',
		description: 'Awarded to members who actively promote open recognition within their community.',
		image: null
	} as unknown as Achievement;

	const { Story } = defineMeta({
		title: 'components/achievement/AchievementSummary',
		component: AchievementSummary,
		tags: ['autodocs'],
		args: {
			achievement,
			linkAchievement: false
		}
	});
</script>

<Story name="Default">
	<div class="p-4">
		<AchievementSummary {achievement} linkAchievement={false} />
	</div>
</Story>

<Story name="Accepted claim">
	<div class="p-4">
		<AchievementSummary
			{achievement}
			linkAchievement={false}
			claim={{ claimStatus: 'ACCEPTED', validFrom: new Date('2020-01-01') } as never}
		/>
	</div>
</Story>

<Story name="With actions snippet">
	<div class="p-4">
		<AchievementSummary {achievement} linkAchievement={false}>
			{#snippet actions()}
				<!-- Demo action only (Storybook has nowhere to navigate); real usages
				     render a route link here, e.g. <a href={resolve(`/achievements/${id}`)}>. -->
				<button type="button" class="text-sm font-medium text-blue-700 hover:underline">View</button
				>
			{/snippet}
		</AchievementSummary>
	</div>
</Story>

<Story name="Clickable (small image)">
	<div class="p-4">
		<AchievementSummary {achievement} linkAchievement={false} imageSize="16" isClickable />
	</div>
</Story>
