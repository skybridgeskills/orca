<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import LoadingSpinner from './LoadingSpinner.svelte';

	const { Story } = defineMeta({
		title: 'components/LoadingSpinner',
		component: LoadingSpinner
	});
</script>

<Story name="LoadingSpinner" asChild>
	<StoryPreview>
		<LoadingSpinner />
	</StoryPreview>
</Story>
