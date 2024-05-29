<script lang="ts">
	export let value = '';
	export let selected = '';
	export let name = '';
	export let label = '';
	export let id = '';
	export let disabled = false;
</script>

<div class="flex items-center">
	<input
		bind:group={selected}
		{value}
		{name}
		{id}
		{disabled}
		type="radio"
		class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
	/>
	<label
		for={id}
		class={`ms-2 text-sm font-medium ${
			disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-300'
		}`}
	>
		<slot>{label}</slot>
	</label>
</div>
