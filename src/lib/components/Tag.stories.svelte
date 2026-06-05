<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import Tag from './Tag.svelte';

	const { Story } = defineMeta({
		title: 'components/Tag',
		component: Tag
	});
</script>

<Story name="Tag" asChild>
	<StoryPreview>
		<div class="space-y-3">
			<Tag open>Admin</Tag>
			<Tag open class="bg-blue-100 text-blue-700">Featured</Tag>
			<Tag open>
				{#snippet trigger()}
					<span class="mr-1">#</span>
				{/snippet}
				tag-with-trigger
			</Tag>
		</div>
	</StoryPreview>
</Story>
