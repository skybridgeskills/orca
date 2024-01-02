<script lang="ts">
	export let text = '';
</script>

<div class="w-full flex justify-between items-center mb-4">
	<slot name="heading"
		><h3 class="inline-flex mt-1 mr-3 text-xl sm:text-2xl text-gray-800 dark:text-white">
			{text}
		</h3></slot
	>
	<div class="inline-flex items-center">
		<slot name="actions" />
	</div>
</div>
