<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import Alert from './Alert.svelte';

	const { Story } = defineMeta({
		title: 'components/Alert',
		component: Alert,
		tags: ['autodocs']
	});
</script>

<Story name="Info">
	<div class="p-4">
		<Alert level="info" message="Heads up — something informational happened." />
	</div>
</Story>

<Story name="Success">
	<div class="p-4">
		<Alert level="success" message="Your changes were saved successfully." />
	</div>
</Story>

<Story name="Warning">
	<div class="p-4">
		<Alert level="warning" message="This action may have unintended consequences." />
	</div>
</Story>

<Story name="Error">
	<div class="p-4">
		<Alert level="error" message="Something went wrong. Please try again." />
	</div>
</Story>

<Story name="With heading">
	<div class="p-4">
		<Alert level="info" heading="Note:" message="Headings render in bold before the message." />
	</div>
</Story>

<Story name="Dismissable">
	<div class="p-4">
		<Alert level="warning" dismissable message="Click the X to dismiss this alert." />
	</div>
</Story>
