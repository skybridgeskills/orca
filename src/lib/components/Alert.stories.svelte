<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';

	import { StoryPreview } from '$lib/storybook';

	import Alert from './Alert.svelte';

	const { Story } = defineMeta({
		title: 'components/Alert',
		component: Alert
	});

	const onclose = fn().mockName('onclose');
</script>

<Story name="Alert" asChild>
	<StoryPreview>
		<div class="space-y-3">
			<Alert level="info" message="Heads up — something informational happened." />
			<Alert level="success" message="Your changes were saved successfully." />
			<Alert level="warning" message="This action may have unintended consequences." />
			<Alert level="error" message="Something went wrong. Please try again." />
			<Alert level="info" heading="Note:" message="Headings render in bold before the message." />
			<Alert level="warning" dismissable message="Click the X to dismiss this alert." {onclose} />
		</div>
	</StoryPreview>
</Story>
