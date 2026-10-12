<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';

	import { StoryPreview } from '$lib/storybook';

	import Button from './Button.svelte';

	const { Story } = defineMeta({
		title: 'components/Button',
		component: Button
	});

	const onclick = fn().mockName('onclick');
</script>

<Story name="Button" asChild>
	<StoryPreview>
		<div class="flex flex-wrap items-center gap-3">
			<Button text="Primary action" submodule="primary" {onclick} />
			<Button text="Secondary action" submodule="secondary" {onclick} />
			<Button text="Delete" submodule="danger" {onclick} />
			<Button text="Disabled action" submodule="primary" disabled {onclick} />
			<Button text="Go to dashboard" href="/dashboard" submodule="secondary" />
			<Button submodule="primary" {onclick}>Custom <strong>content</strong></Button>
		</div>
	</StoryPreview>
</Story>
