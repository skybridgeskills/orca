<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import FormFieldHelperText from './FormFieldHelperText.svelte';

	const { Story } = defineMeta({
		title: 'components/forms/FormFieldHelperText',
		component: FormFieldHelperText
	});
</script>

<Story name="FormFieldHelperText" asChild>
	<StoryPreview>
		<div class="space-y-4">
			<FormFieldHelperText text="This is shown beneath a form field." />
			<FormFieldHelperText text="This is shown beneath a form field." disabled />
			<FormFieldHelperText>Helper text with <em>emphasis</em>.</FormFieldHelperText>
		</div>
	</StoryPreview>
</Story>
