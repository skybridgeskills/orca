<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import { FaSolidTrash } from 'svelte-icons-pack/fa';
	import { FaCircleUser as FaUserCircle } from 'svelte-icons-pack/fa';

	import { StoryPreview } from '$lib/storybook';

	import IconButton from './IconButton.svelte';

	const { Story } = defineMeta({
		title: 'components/IconButton',
		component: IconButton
	});

	const onclick = fn().mockName('onclick');
</script>

<Story name="IconButton" asChild>
	<StoryPreview>
		<div class="flex flex-wrap items-center gap-3">
			<IconButton id="icon-profile" src={FaUserCircle} text="Profile" {onclick} />
			<IconButton id="icon-trash" src={FaSolidTrash} size="20" text="Delete" {onclick} />
		</div>
	</StoryPreview>
</Story>
