<script lang="ts">
	export let text: string = '';
	export let disabled = false;

	const tColor = 'text-gray-900 dark:text-gray-300'; // Default text color
	const dtColor = 'text-gray-400 dark:text-gray-600'; // Disabled text color
</script>

<p class={`block mb-2 text-xs ${disabled ? dtColor : tColor}`}>
	<slot>{text}</slot>
</p>
