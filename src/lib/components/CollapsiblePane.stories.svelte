<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import CollapsiblePane from './CollapsiblePane.svelte';

	const { Story } = defineMeta({
		title: 'components/CollapsiblePane',
		component: CollapsiblePane
	});

	// CollapsiblePane exposes no event callback prop — toggling is handled internally
	// and reflected via the bindable `open` prop — so there is nothing to wire to fn().
</script>

<Story name="CollapsiblePane" asChild>
	<StoryPreview>
		<div class="space-y-4">
			<CollapsiblePane title="Open section" open>
				<p class="text-sm">This content is visible because the pane starts open.</p>
			</CollapsiblePane>
			<CollapsiblePane title="Closed section">
				<p class="text-sm">Click the title to reveal this content.</p>
			</CollapsiblePane>
			<CollapsiblePane title="With button extra">
				<p class="text-sm">Body content of the pane.</p>
				{#snippet buttonExtra()}
					<span class="text-xs text-gray-500 italic">3 changes pending</span>
				{/snippet}
			</CollapsiblePane>
		</div>
	</StoryPreview>
</Story>
