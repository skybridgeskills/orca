<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import Card from './Card.svelte';

	const { Story } = defineMeta({
		title: 'components/Card',
		component: Card
	});
</script>

<Story name="Card" asChild>
	<StoryPreview>
		<ul class="space-y-3">
			<Card>
				<h3 class="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
					Card title
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					A basic card rendering its default children.
				</p>
			</Card>

			<Card>
				<h3 class="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
					Card with actions
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					The actions snippet renders at the foot.
				</p>
				{#snippet actions()}
					<button type="button" class="text-sm font-medium text-blue-700 hover:underline"
						>Learn more</button
					>
				{/snippet}
			</Card>

			<Card href="#" hoverEffect>
				<h3 class="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
					Clickable card
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Renders as an anchor with a hover shadow.
				</p>
			</Card>

			<Card />
		</ul>
	</StoryPreview>
</Story>
