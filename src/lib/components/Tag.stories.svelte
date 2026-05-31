<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import Tag from './Tag.svelte';

	const { Story } = defineMeta({
		title: 'components/Tag',
		component: Tag,
		tags: ['autodocs']
	});
</script>

<Story name="Open">
	<div class="p-4">
		<Tag open>Admin</Tag>
	</div>
</Story>

<Story name="Custom color">
	<div class="p-4">
		<Tag open class="bg-blue-100 text-blue-700">Featured</Tag>
	</div>
</Story>

<Story name="With trigger">
	<div class="p-4">
		<Tag open>
			{#snippet trigger()}
				<span class="mr-1">#</span>
			{/snippet}
			tag-with-trigger
		</Tag>
	</div>
</Story>
