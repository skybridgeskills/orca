<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import Button from './Button.svelte';

	const { Story } = defineMeta({
		title: 'components/Button',
		component: Button,
		tags: ['autodocs']
	});
</script>

<Story name="Primary">
	<div class="p-4">
		<Button text="Primary action" submodule="primary" />
	</div>
</Story>

<Story name="Secondary">
	<div class="p-4">
		<Button text="Secondary action" submodule="secondary" />
	</div>
</Story>

<Story name="Danger">
	<div class="p-4">
		<Button text="Delete" submodule="danger" />
	</div>
</Story>

<Story name="Disabled">
	<div class="p-4">
		<Button text="Disabled action" submodule="primary" disabled />
	</div>
</Story>

<Story name="Link variant">
	<div class="p-4">
		<Button text="Go to dashboard" href="#" submodule="secondary" />
	</div>
</Story>

<Story name="With children">
	<div class="p-4">
		<Button submodule="primary">Custom <strong>content</strong></Button>
	</div>
</Story>
