<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import DarkModeToggle from './DarkModeToggle.svelte';

	const { Story } = defineMeta({
		title: 'components/DarkModeToggle',
		component: DarkModeToggle,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<div class="p-4">
		<DarkModeToggle />
	</div>
</Story>
