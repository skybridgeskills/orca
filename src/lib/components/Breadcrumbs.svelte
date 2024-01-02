<script lang="ts">
	import * as m from '$lib/i18n/messages';

	interface Item {
		text: string;
		href?: string;
		icon?: string;
		props?: object;
		class?: string;
	}

	export let items: Array<Item>;
</script>

<nav class="flex" aria-label={m.breadcrumb()}>
	<ol class="inline-flex items-center space-x-1 md:space-x-3 mb-4">
		{#each items as item, i}
			{#if i !== 0}
				<li class="divider dark:text-gray-400">
					<!-- The slot used for divider -->
					<slot name="divider">/</slot>
				</li>
			{/if}
			<li class="inline-flex items-center">
				<slot {item}>
					{#if item.href}
						<a
							href={item.href}
							class="breadcrumb-item inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white {item.class}"
							{...item.props}
						>
							{item.text}
						</a>
					{:else}
						<span
							class="breadcrumb-item disabled text-sm font-medium text-gray-500 dark:text-gray-400 {item.class}"
							{...item.props}
						>
							{item.text}
						</span>
					{/if}
				</slot>
			</li>
		{/each}
	</ol>
</nav>
