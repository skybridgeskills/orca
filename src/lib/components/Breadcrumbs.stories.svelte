<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import Breadcrumbs from './Breadcrumbs.svelte';

	const { Story } = defineMeta({
		title: 'components/Breadcrumbs',
		component: Breadcrumbs,
		tags: ['autodocs']
	});

	const items = [
		{ text: 'Home', href: '/' },
		{ text: 'Achievements', href: '/achievements' },
		{ text: 'Current badge' }
	];
</script>

<Story name="Default">
	<div class="p-4">
		<Breadcrumbs {items} />
	</div>
</Story>

<Story name="Single item">
	<div class="p-4">
		<Breadcrumbs items={[{ text: 'Home', href: '/' }]} />
	</div>
</Story>

<Story name="Custom divider">
	<div class="p-4">
		<Breadcrumbs {items}>
			{#snippet divider()}
				<span class="px-1">&gt;</span>
			{/snippet}
		</Breadcrumbs>
	</div>
</Story>
