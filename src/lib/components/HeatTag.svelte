<script lang="ts">
	export let heat: number = 0.0;
	export let text: string = '';
	export let link: string = '';
	let state: 'div' | 'a' = 'div';
	let r_heat = 0;

	let klass =
		'rounded-full py-0.5 px-2 text-xs font-semibold inline-flex items-center me-2 leading-6 bg-slate-500 dark:bg-slate-700 text-white dark:text-slate-100';
	// This will add the hover highlight if you pass the link attribute
	if (link != '') {
		klass += ' hover:bg-blue-500 dark:hover:bg-blue-500';
		state = 'a';
	}
	// just makes sure that the r_heat value will work no matter what is passed to it
	if (heat >= 0 && heat <= 4) {
		r_heat = Math.round(heat);
	} else if (heat > 4) {
		r_heat = 4;
	}
</script>

<!-- this is the whole tag-->
<svelte:element this={state} class={klass} href={link} tabindex="0">
	<!-- this is so the text in the button truncates only itself, and not the image-->
	<span class="truncate text-xs tagwidth">
		{text}
	</span>
	<!-- if logic that selects the correct coloring of the image for the heat-->
	{#if r_heat === 0}
		<svg width="25" height="25" viewBox="-15 0 100 110" xmlns="http://www.w3.org/2000/svg">
			<rect
				x="10"
				y="70"
				width="15"
				height="20"
				rx="5"
				ry="5"
				fill="black"
				stroke="red"
				stroke-width="3"
			/>
			<rect
				x="30"
				y="50"
				width="15"
				height="40"
				rx="5"
				ry="5"
				fill="black"
				stroke="red"
				stroke-width="3"
			/>
			<rect
				x="50"
				y="30"
				width="15"
				height="60"
				rx="5"
				ry="5"
				fill="black"
				stroke="red"
				stroke-width="3"
			/>
			<rect
				x="70"
				y="10"
				width="15"
				height="80"
				rx="5"
				ry="5"
				fill="black"
				stroke="red"
				stroke-width="3"
			/>
		</svg>
	{:else if r_heat == 1}
		<svg width="25" height="25" viewBox="-15 0 100 110" xmlns="http://www.w3.org/2000/svg">
			<rect x="10" y="70" width="15" height="20" rx="5" ry="5" fill="orange" stroke="orange" />
			<rect
				x="30"
				y="50"
				width="15"
				height="40"
				rx="5"
				ry="5"
				fill="black"
				stroke="orange"
				stroke-width="3"
			/>
			<rect
				x="50"
				y="30"
				width="15"
				height="60"
				rx="5"
				ry="5"
				fill="black"
				stroke="orange"
				stroke-width="3"
			/>
			<rect
				x="70"
				y="10"
				width="15"
				height="80"
				rx="5"
				ry="5"
				fill="black"
				stroke="orange"
				stroke-width="3"
			/>
		</svg>
	{:else if r_heat == 2}
		<svg width="25" height="25" viewBox="-15 0 100 110" xmlns="http://www.w3.org/2000/svg">
			<rect x="10" y="70" width="15" height="20" rx="5" ry="5" fill="#0E9F6E" stroke="#0E9F6E" />
			<rect x="30" y="50" width="15" height="40" rx="5" ry="5" fill="#0E9F6E" stroke="#0E9F6E" />
			<rect
				x="50"
				y="30"
				width="15"
				height="60"
				rx="5"
				ry="5"
				fill="black"
				stroke="#0E9F6E"
				stroke-width="3"
			/>
			<rect
				x="70"
				y="10"
				width="15"
				height="80"
				rx="5"
				ry="5"
				fill="black"
				stroke="#0E9F6E"
				stroke-width="3"
			/>
		</svg>
	{:else if r_heat == 3}
		<svg width="25" height="25" viewBox="-15 0 100 110" xmlns="http://www.w3.org/2000/svg">
			<rect x="10" y="70" width="15" height="20" rx="5" ry="5" fill="#0E9F6E" stroke="#0E9F6E" />
			<rect x="30" y="50" width="15" height="40" rx="5" ry="5" fill="#0E9F6E" stroke="#0E9F6E" />
			<rect x="50" y="30" width="15" height="60" rx="5" ry="5" fill="#0E9F6E" stroke="#0E9F6E" />
			<rect
				x="70"
				y="10"
				width="15"
				height="80"
				rx="5"
				ry="5"
				fill="black"
				stroke="#0E9F6E"
				stroke-width="3"
			/>
		</svg>
	{:else if r_heat == 4}
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
