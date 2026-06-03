<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Text content (ignored when `children` is provided). */
		text?: string;
		/** When set, the badge renders as an external link opening in a new tab. */
		href?: string;
		/** Visual style. */
		variant?: 'default' | 'info' | 'danger';
		/** Accessible label appended for external links, e.g. "(opens in new tab)". */
		newTabLabel?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		text = '',
		href = '',
		variant = 'default',
		newTabLabel = '',
		class: klass = '',
		children
	}: Props = $props();

	const base = 'rounded-full px-3 py-1 text-xs inline-flex items-center gap-1 leading-5 max-w-full';

	const variants: Record<NonNullable<Props['variant']>, string> = {
		default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
		info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
		danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
	};

	const hoverWhenLink = $derived(
		href ? ' hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:underline' : ''
	);
	const cls = $derived(`${base} ${variants[variant]}${hoverWhenLink} ${klass}`.trim());
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	class={cls}
	{...href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {}}
>
	<span class="truncate"
		>{#if children}{@render children()}{:else}{text}{/if}</span
	>
	{#if href}
		<!-- external-link indicator -->
		<svg
			class="h-3 w-3 shrink-0"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M14 5h5v5m0-5L10 14M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"
			/>
		</svg>
		{#if newTabLabel}<span class="sr-only">{newTabLabel}</span>{/if}
	{/if}
</svelte:element>
