<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import LoadingSpinner from './LoadingSpinner.svelte';

	const { Story } = defineMeta({
		title: 'components/LoadingSpinner',
		component: LoadingSpinner,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<div class="p-4">
		<LoadingSpinner />
	</div>
</Story>
