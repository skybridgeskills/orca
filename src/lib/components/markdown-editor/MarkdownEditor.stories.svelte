<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import MarkdownEditor from './MarkdownEditor.svelte';

	const { Story } = defineMeta({
		title: 'components/MarkdownEditor',
		component: MarkdownEditor
	});
</script>

<script lang="ts">
	let value = $state('# Hello\n\nSome **markdown** content.');
</script>

<Story name="Default" asChild>
	<StoryPreview>
		<div class="max-w-2xl">
			<MarkdownEditor bind:value inputName="criteriaNarrative" />
		</div>
	</StoryPreview>
</Story>

<Story name="Disabled" asChild>
	<StoryPreview>
		<div class="max-w-2xl">
			<MarkdownEditor value="Read-only content." inputName="criteriaNarrative" disabled />
		</div>
	</StoryPreview>
</Story>
