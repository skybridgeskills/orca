<script lang="ts">
	import Icon from 'svelte-icons-pack/Icon.svelte';
	export let src: any;
	export let id: string;
	export let size = '32';
	export let text = '';
</script>

<button
	{id}
	type="button"
	class="ml-2 y-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm"
	on:click
	on:keypress
>
	<div class="icon text-gray-500 grid place-items-center">
		<Icon {src} {size} color="currentColor" /> <span class="sr-only">{text}</span>
	</div>
</button>

<style>
	.icon {
		width: 32px;
		height: 32px;
	}
</style>
