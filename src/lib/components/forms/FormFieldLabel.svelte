<script lang="ts">
	export let text = '';
	let inputId: string;
	export { inputId as for };
	export let disabled = false;

	const tColor = 'text-gray-900 dark:text-gray-300'; // Default text color
	const dtColor = 'text-gray-400 dark:text-gray-600'; // Disabled text color
</script>

<label for={inputId} class={`block mb-2 text-sm font-medium ${disabled ? dtColor : tColor}`}>
	<slot>{text}</slot>
</label>
