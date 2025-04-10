<script lang="ts">
	interface TabItem {
		id: string;
		name: string;
		href?: string;
		onClick?: () => void;
	}
	interface Props {
		items?: TabItem[];
		currentItemId?: string;
	}

	let { items = [], currentItemId = '' }: Props = $props();

	const currentClasses =
		'inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500';
	const defaultClasses =
		'inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300';
</script>

<ul class="flex flex-wrap -mb-px">
	{#each items as item}
		<li class="me-2">
			{#if item.href}
				<a class={item.id == currentItemId ? currentClasses : defaultClasses} href={item.href}>
					{item.name}
				</a>
			{:else}
				<button
					class={item.id == currentItemId ? currentClasses : defaultClasses}
					onclick={item.onClick}
				>
					{item.name}
				</button>
			{/if}
		</li>
	{/each}
</ul>
