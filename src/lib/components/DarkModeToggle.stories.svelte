<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';

	import { StoryPreview } from '$lib/storybook';

	import DarkModeToggle from './DarkModeToggle.svelte';

	const { Story } = defineMeta({
		title: 'components/DarkModeToggle',
		component: DarkModeToggle
	});

	const onclick = fn().mockName('onclick');
</script>

<!--
	Special case: DarkModeToggle flips the GLOBAL theme (it toggles `.dark` on
	<html> and writes localStorage.theme via the preferredTheme store). It does not
	support independent per-panel theming, so we render a SINGLE light panel rather
	than side-by-side light/dark. Clicking it changes the global Storybook theme;
	the click also reports to the Actions panel via the wired onclick fn().
-->
<Story name="DarkModeToggle" asChild>
	<StoryPreview themes={['light']}>
		<DarkModeToggle {onclick} />
	</StoryPreview>
</Story>
