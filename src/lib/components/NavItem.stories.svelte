<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';

	import { StoryPreview } from '$lib/storybook';

	import NavItem from './NavItem.svelte';

	const { Story } = defineMeta({
		title: 'components/NavItem',
		component: NavItem
	});

	const onclick = fn().mockName('onclick');
</script>

<Story name="Default" asChild>
	<StoryPreview>
		<ul>
			<NavItem href="/achievements" title="Achievements" {onclick} />
		</ul>
	</StoryPreview>
</Story>

<!--
	NavItem marks itself "current" when `$page.url.pathname` matches its resolved
	href. We feed the page store via @storybook/sveltekit's
	`sveltekit_experimental.stores.page` so this variant renders in the active state
	(resolve('/') === '/' under the Storybook $app/paths mock).
-->
<Story
	name="Active (current page)"
	asChild
	parameters={{
		sveltekit_experimental: { stores: { page: { url: new URL('http://localhost/') } } }
	}}
>
	<StoryPreview>
		<ul>
			<NavItem href="/" title="Home" {onclick} />
		</ul>
	</StoryPreview>
</Story>
