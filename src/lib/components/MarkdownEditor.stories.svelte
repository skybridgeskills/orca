<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import MarkdownEditor from './MarkdownEditor.svelte';

	const { Story } = defineMeta({
		title: 'components/MarkdownEditor',
		component: MarkdownEditor,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let value = $state('# Hello\n\nSome **markdown** content.');
</script>

<Story name="Default">
	<div class="p-4 max-w-2xl">
		<MarkdownEditor bind:value inputName="criteriaNarrative" />
	</div>
</Story>

<Story name="Disabled">
	<div class="p-4 max-w-2xl">
		<MarkdownEditor value="Read-only content." inputName="criteriaNarrative" disabled />
	</div>
</Story>
