<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import Tabs from './Tabs.svelte';

	const { Story } = defineMeta({
		title: 'components/Tabs',
		component: Tabs,
		tags: ['autodocs']
	});

	const items = [
		{ id: 'overview', name: 'Overview', onClick: () => {} },
		{ id: 'claims', name: 'Claims', onClick: () => {} },
		{ id: 'endorsements', name: 'Endorsements', onClick: () => {} }
	];
</script>

<Story name="Default">
	<div class="p-4">
		<Tabs {items} currentItemId="overview" />
	</div>
</Story>

<Story name="Second selected">
	<div class="p-4">
		<Tabs {items} currentItemId="claims" />
	</div>
</Story>

<Story name="Link tabs">
	<div class="p-4">
		<Tabs
			items={[
				{ id: 'a', name: 'Page A', href: '#a' },
				{ id: 'b', name: 'Page B', href: '#b' }
			]}
			currentItemId="a"
		/>
	</div>
</Story>
