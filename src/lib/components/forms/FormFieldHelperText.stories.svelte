<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import FormFieldHelperText from './FormFieldHelperText.svelte';

	const { Story } = defineMeta({
		title: 'components/forms/FormFieldHelperText',
		component: FormFieldHelperText,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<div class="p-4">
		<FormFieldHelperText text="This is shown beneath a form field." />
	</div>
</Story>

<Story name="Disabled">
	<div class="p-4">
		<FormFieldHelperText text="This is shown beneath a form field." disabled />
	</div>
</Story>

<Story name="With children">
	<div class="p-4">
		<FormFieldHelperText>Helper text with <em>emphasis</em>.</FormFieldHelperText>
	</div>
</Story>
