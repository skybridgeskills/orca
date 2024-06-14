<script lang="ts">
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	export let open: boolean = false;
	export let title: string = '';
	let rotation: string = 'rotate(-90)';

	function handleClick() {
		open = !open;
		if (rotation == '') {
			rotation = 'rotate(-90)';
		} else {
			rotation = '';
		}
	}
</script>

<button on:click={handleClick} tabindex="0" >
	<span class="inline-flex items-center px-2.5 py-0.5 rounded me-2 text-slate-600 dark:text-slate-500">
		<svg
			version="1.1"
			id="Layer_1"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			x="0px"
			y="0px"
			width="35"
			viewBox="0 0 1024 1024"
			transform={rotation}
            fill="currentColor"
		>
       
			<path
				
				opacity="1.000000"
				stroke="none"
				d="
                M750.578369,483.571228 
                C760.778015,474.707428 770.731445,466.099609 780.629883,457.428955 
                C783.126892,455.241608 785.445740,455.333801 787.630676,457.660950 
                C800.055969,470.895233 813.397461,483.258362 825.065430,497.218109 
                C827.893005,500.601105 826.022400,502.642944 823.644653,504.743683 
                C811.786682,515.220154 799.883118,525.645020 788.034424,536.132019 
                C754.482239,565.828186 720.965515,595.564331 687.404114,625.250122 
                C648.355103,659.789734 609.281555,694.301636 570.202515,728.807312 
                C551.863037,745.000671 533.478271,761.142700 515.138977,777.336243 
                C513.585266,778.708069 512.407959,778.633850 510.845520,777.252808 
                C441.956055,716.366089 373.020721,655.531250 304.129242,594.646729 
                C270.299683,564.749023 236.572983,534.734802 202.714142,504.870300 
                C199.200027,501.770721 198.942001,499.581879 202.137680,495.860687 
                C213.335434,482.821503 225.878098,471.085815 237.548538,458.514740 
                C240.336548,455.511536 242.694656,455.183594 246.009918,458.053375 
                C298.026154,503.079407 350.112213,548.024719 402.209442,592.957092 
                C432.482819,619.067017 462.796417,645.130310 493.112488,671.190735 
                C498.290527,675.641907 503.678955,679.853210 508.766449,684.403015 
                C511.863129,687.172485 514.200500,686.989136 517.347412,684.273987 
                C544.589355,660.768982 572.002014,637.461792 599.273438,613.990723 
                C649.651855,570.632568 699.969055,527.203430 750.578369,483.571228 
z"
			/>
		</svg>
		<span class="whitespace-pre-line text-xl font-semibold text-black dark:text-white">{title}</span
		>
	</span>
</button>

<hr class="h-px mb-2 mx-2 bg-gray-300 border-0 dark:bg-gray-700">
{#if open}
	<div
		transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}
		class="ml-12 mr-12 mb-4 text-black dark:text-white"
	>
		<slot />
	</div>
{/if}
