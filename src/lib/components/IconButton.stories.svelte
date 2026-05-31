<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { FaSolidTrash } from 'svelte-icons-pack/fa';
	import { FaCircleUser as FaUserCircle } from 'svelte-icons-pack/fa';

	import IconButton from './IconButton.svelte';

	const { Story } = defineMeta({
		title: 'components/IconButton',
		component: IconButton,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<div class="p-4">
		<IconButton id="icon-profile" src={FaUserCircle} text="Profile" />
	</div>
</Story>

<Story name="Trash">
	<div class="p-4">
		<IconButton id="icon-trash" src={FaSolidTrash} size="20" text="Delete" />
	</div>
</Story>
