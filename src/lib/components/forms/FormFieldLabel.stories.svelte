<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import FormFieldLabel from './FormFieldLabel.svelte';

	const { Story } = defineMeta({
		title: 'components/forms/FormFieldLabel',
		component: FormFieldLabel,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<div class="p-4">
		<FormFieldLabel for="example" text="Achievement name" />
	</div>
</Story>

<Story name="Disabled">
	<div class="p-4">
		<FormFieldLabel for="example" text="Achievement name" disabled />
	</div>
</Story>

<Story name="With children">
	<div class="p-4">
		<FormFieldLabel for="example">Custom <strong>label</strong></FormFieldLabel>
	</div>
</Story>
