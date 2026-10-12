<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import FormFieldLabel from './FormFieldLabel.svelte';

	const { Story } = defineMeta({
		title: 'components/forms/FormFieldLabel',
		component: FormFieldLabel
	});
</script>

<Story name="FormFieldLabel" asChild>
	<StoryPreview>
		<div class="space-y-4">
			<FormFieldLabel for="example" text="Achievement name" />
			<FormFieldLabel for="example-disabled" text="Achievement name" disabled />
			<FormFieldLabel for="example-children">Custom <strong>label</strong></FormFieldLabel>
		</div>
	</StoryPreview>
</Story>
