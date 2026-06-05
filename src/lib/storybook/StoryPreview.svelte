<script lang="ts" module>
	export type StoryTheme = 'light' | 'dark';
	export type StoryWidth = number | 'sm' | 'md' | 'lg' | 'xl';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		/** Themes to render. Default: both. */
		themes?: StoryTheme[];
		/** Fixed pixel widths (or named) per theme. Empty => one natural-width panel per theme. */
		widths?: StoryWidth[];
		/** Show the per-panel label header. Default: true. */
		label?: boolean;
	}

	let { children, themes = ['light', 'dark'], widths = [], label = true }: Props = $props();

	const named: Record<'sm' | 'md' | 'lg' | 'xl', number> = { sm: 320, md: 480, lg: 768, xl: 1024 };
	const toPx = (w: StoryWidth) => (typeof w === 'number' ? w : named[w]);

	type Panel = { theme: StoryTheme; width: number | null };

	const panels: Panel[] = $derived(
		widths.length
			? widths.flatMap((w) => themes.map((theme) => ({ theme, width: toPx(w) })))
			: themes.map((theme) => ({ theme, width: null }))
	);

	function panelLabel(p: Panel): string {
		const theme = p.theme === 'dark' ? 'Dark' : 'Light';
		return p.width ? `${theme} · ${p.width}px` : theme;
	}
</script>

<div class="flex flex-wrap items-start gap-4 p-4">
	{#each panels as p, i (i)}
		<div
			class="overflow-hidden rounded-lg border border-gray-200 {p.theme === 'dark'
				? 'dark bg-gray-900 text-gray-100'
				: 'bg-white text-gray-900'}"
			style={p.width ? `width:${p.width}px` : undefined}
		>
			{#if label}
				<div
					class="border-b border-gray-200 px-3 py-1 text-xs font-medium {p.theme === 'dark'
						? 'border-gray-700 text-gray-400'
						: 'text-gray-500'}"
				>
					{panelLabel(p)}
				</div>
			{/if}
			<div class="p-3">
				{@render children()}
			</div>
		</div>
	{/each}
</div>
