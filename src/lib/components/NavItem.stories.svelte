<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import NavItem from './NavItem.svelte';

	const { Story } = defineMeta({
		title: 'components/NavItem',
		component: NavItem,
		tags: ['autodocs'],
		args: {
			href: '/achievements',
			title: 'Achievements'
		}
	});
</script>

<Story name="Default">
	<ul class="p-4">
		<NavItem href="/achievements" title="Achievements" />
	</ul>
</Story>

<Story name="Active (current page)">
	<ul class="p-4">
		<NavItem href="/" title="Home" />
	</ul>
</Story>
