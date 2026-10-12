<script lang="ts">
	import Heading from '$lib/components/Heading.svelte';

	interface Props {
		title?: string;
		description?: string;
		image?: import('svelte').Snippet;
		descriptionSnippet?: import('svelte').Snippet;
	}

	let { title = '', description = '', image, descriptionSnippet }: Props = $props();
</script>

<!--
	Use this component for when there are no objects and the user
	should be prompted with a call to action to resolve the empty state.
-->

<div class="bg-white dark:bg-gray-800 p-6 mt-10 max-w-3xl rounded-sm shadow-sm">
	<div class="flex flex-col sm:flex-row gap-4">
		<div class="text-gray-500 w-40 dark:text-white">
			{@render image?.()}
		</div>
		<div>
			<Heading {title} level="h2" {description}>
				{@render descriptionSnippet?.()}
			</Heading>
		</div>
	</div>
</div>
