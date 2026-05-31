<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import ImageFileDrop from './ImageFileDrop.svelte';

	const { Story } = defineMeta({
		title: 'components/ImageFileDrop',
		component: ImageFileDrop,
		tags: ['autodocs']
	});
</script>

<Story name="Empty">
	<div class="p-4 max-w-xl">
		<ImageFileDrop currentValue={null} imageExtension={null} />
	</div>
</Story>

<Story name="With image">
	<div class="p-4 max-w-xl">
		<ImageFileDrop currentValue="https://placehold.co/200x200/png" imageExtension="png" />
	</div>
</Story>
