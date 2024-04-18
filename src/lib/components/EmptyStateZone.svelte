<script lang="ts">
	import Heading from '$lib/components/Heading.svelte';

	export let title = '';
	export let description = '';
</script>

<!--
	Use this component for when there are no objects and the user 
	should be prompted with a call to action to resolve the empty state. 
	Use a link in the 
-->

<div class="bg-white dark:bg-gray-800 p-6 mt-10 max-w-3xl rounded shadow">
	<div class="flex flex-col sm:flex-row gap-4">
		<div class="text-gray-500 w-40 dark:text-white">
			<slot name="image" />
		</div>
		<div>
			<Heading {title} level="h2">
				<slot name="description">{description}</slot>
			</Heading>
		</div>
	</div>
</div>
