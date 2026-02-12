<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { imageUrl } from '$lib/utils/imageUrl';
	import { FileDrop } from 'svelte-droplet';
	export let errorMessage: string | null = null;
	export let currentValue: string | null;
	export let imageExtension: string | null;

	const handleFiles = (files: File[]) => {
		// There will only be one file
		if (files.length) {
			const file = files[0];
			if (file?.name) {
				imageExtension = file.name.split('.').slice(-1)[0].toLowerCase();
				if (imageExtension !== 'svg' && imageExtension !== 'png')
					errorMessage = `Image must be PNG or SVG. No match: ${file.name}`;
			}

			imageFile = files[0];

			let reader = new FileReader();
			if (imageFile) reader.readAsDataURL(imageFile);

			reader.onload = (e) => {
				currentValue = e.target?.result?.toString() || '';
			};
		}
	};

	const handleClearImage = () => {
		currentValue = null;
		imageExtension = null;
	};

	let imageFile: File | null = null;
</script>

<FileDrop {handleFiles} max={1}>
	<div class="flex justify-center items-center w-full mb-6">
		<div
			class="flex flex-col justify-center items-center w-full h-72 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
		>
			{#if !currentValue}
				<div class="flex flex-col justify-center items-center pt-5 pb-6">
					<svg
						aria-hidden="true"
						class="mb-3 w-10 h-10 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
						/></svg
					>
					<p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
						<span class="font-semibold">{m.ok_firey_fireant_intend()}</span>
						{m.still_flat_horse_assure()}
					</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">{m.white_fit_fox_zap()}</p>
				</div>
			{:else}
				<div
					class="relative flex flex-row sm:flex-col justify-center items-center pt-5 pb-6 max-w-full max-h-full"
				>
					<img
						src={imageUrl(currentValue)}
						role="presentation"
						alt="Org Logo"
						class="p-3 rounded-md max-w-[80%] max-h-64 object-contain"
					/>
					<div class="p-1">
						<p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
							<span class="font-semibold">{m.front_real_peacock_endure()}</span>
							{m.still_flat_horse_assure()}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">{m.white_fit_fox_zap()}</p>
					</div>

					<div class="text-xs text-gray-500 dark:text-gray-400 absolute top-7 right-4">
						<button on:click|stopPropagation={handleClearImage}
							>{m.helpful_lost_angelfish_startle()}</button
						>
					</div>
				</div>
			{/if}
		</div>
	</div>
</FileDrop>
