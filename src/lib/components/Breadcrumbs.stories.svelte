<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import Breadcrumbs from './Breadcrumbs.svelte';

	const { Story } = defineMeta({
		title: 'components/Breadcrumbs',
		component: Breadcrumbs
	});

	const items = [
		{ text: 'Home', href: '/' },
		{ text: 'Achievements', href: '/achievements' },
		{ text: 'Current badge' }
	];
</script>

<Story name="Breadcrumbs" asChild>
	<StoryPreview widths={[320, 768]}>
		<div class="space-y-3">
			<Breadcrumbs {items} />
			<Breadcrumbs items={[{ text: 'Home', href: '/' }]} />
			<Breadcrumbs {items}>
				{#snippet divider()}
					<span class="px-1">&gt;</span>
				{/snippet}
			</Breadcrumbs>
		</div>
	</StoryPreview>
</Story>
