<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import CollapsiblePane from './CollapsiblePane.svelte';

	const { Story } = defineMeta({
		title: 'components/CollapsiblePane',
		component: CollapsiblePane,
		tags: ['autodocs']
	});
</script>

<Story name="Open">
	<div class="p-4">
		<CollapsiblePane title="Section title" open>
			<p class="text-sm">This content is visible because the pane starts open.</p>
		</CollapsiblePane>
	</div>
</Story>

<Story name="Closed">
	<div class="p-4">
		<CollapsiblePane title="Section title">
			<p class="text-sm">Click the title to reveal this content.</p>
		</CollapsiblePane>
	</div>
</Story>

<Story name="With button extra">
	<div class="p-4">
		<CollapsiblePane title="Settings">
			<p class="text-sm">Body content of the pane.</p>
			{#snippet buttonExtra()}
				<span class="text-xs italic text-gray-500">3 changes pending</span>
			{/snippet}
		</CollapsiblePane>
	</div>
</Story>
