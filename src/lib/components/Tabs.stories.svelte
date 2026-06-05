<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';

	import { StoryPreview } from '$lib/storybook';

	import Tabs from './Tabs.svelte';

	const { Story } = defineMeta({
		title: 'components/Tabs',
		component: Tabs
	});

	const items = [
		{ id: 'overview', name: 'Overview', onClick: fn().mockName('tab:overview') },
		{ id: 'claims', name: 'Claims', onClick: fn().mockName('tab:claims') },
		{ id: 'endorsements', name: 'Endorsements', onClick: fn().mockName('tab:endorsements') }
	];

	const linkItems = [
		{ id: 'a', name: 'Page A', href: '/page-a' },
		{ id: 'b', name: 'Page B', href: '/page-b' }
	];
</script>

<Story name="Tabs" asChild>
	<StoryPreview widths={[320, 768]}>
		<div class="space-y-4">
			<Tabs {items} currentItemId="overview" />
			<Tabs {items} currentItemId="claims" />
			<Tabs items={linkItems} currentItemId="a" />
		</div>
	</StoryPreview>
</Story>
