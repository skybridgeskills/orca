<script lang="ts">
	interface Props {
		heat?: number;
		text?: string;
		href?: string;
	}

	let { heat = 0.0, text = '', href = '' }: Props = $props();
	let elem = href ? 'a' : 'span';

	type BarCount = 0 | 1 | 2 | 3 | 4;
	// Clamp and round heat to min 0 and max 4
	const filledBars = Math.min(4, Math.max(0, Math.round(heat))) as BarCount;

	const strokes: { [K in BarCount]: string } = {
		0: '#999',
		1: 'orange',
		2: '#0E9F6E',
		3: '#0E9F6E',
		4: 'url(#Gradient)'
	};
	const fills = {
		0: 'black',
		1: 'orange',
		2: '#0E9F6E',
		3: '#0E9F6E',
		4: 'url(#Gradient)'
	};

	let klass =
		$state('rounded-full py-0.5 px-2 text-xs font-semibold inline-flex items-center me-2 leading-6 bg-slate-500 dark:bg-slate-700 text-white dark:text-slate-100');
	// Link hover color
	if (href) {
		klass += ' hover:bg-blue-500 dark:hover:bg-blue-500';
	}
</script>

<svelte:element this={elem} class={klass} {href} tabindex="0">
	<span class="truncate text-xs tagwidth">
		{text}
	</span>
	{#if filledBars <= 3}
		<svg width="25" height="25" viewBox="-15 0 100 110" xmlns="http://www.w3.org/2000/svg">
			<rect
				x="10"
				y="70"
				width="15"
				height="20"
				rx="5"
				ry="5"
				stroke-width="3"
				fill={filledBars >= 1 ? fills[filledBars] : 'black'}
				stroke={strokes[filledBars]}
			/>
			<rect
				x="30"
				y="50"
				width="15"
				height="40"
				rx="5"
				ry="5"
				stroke-width="3"
				fill={filledBars >= 2 ? fills[filledBars] : 'black'}
				stroke={strokes[filledBars]}
			/>
			<rect
				x="50"
				y="30"
				width="15"
				height="60"
				rx="5"
				ry="5"
				stroke-width="3"
				fill={filledBars >= 3 ? fills[filledBars] : 'black'}
				stroke={strokes[filledBars]}
			/>
			<rect
				x="70"
				y="10"
				width="15"
				height="80"
				rx="5"
				ry="5"
				stroke-width="3"
				fill="black"
				stroke={strokes[filledBars]}
			/>
		</svg>
	{:else}
		<svg width="25" height="25" viewBox="-15 0 100 110" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="Gradient" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stop-color="#ca8a04" />
					<stop offset="60%" stop-color="white" stop-opacity=".9" />
					<stop offset="100%" stop-color="#eab308" />
				</linearGradient>
			</defs>
			<rect x="10" y="70" width="15" height="20" rx="5" ry="5" fill="url(#Gradient)" />
			<rect x="30" y="50" width="15" height="40" rx="5" ry="5" fill="url(#Gradient)" />
			<rect x="50" y="30" width="15" height="60" rx="5" ry="5" fill="url(#Gradient)" />
			<rect x="70" y="10" width="15" height="80" rx="5" ry="5" fill="url(#Gradient)" />
		</svg>
	{/if}
</svelte:element>

<style>
	.tagwidth {
		max-width: 10rem;
	}
</style>
