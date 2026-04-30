<script lang="ts">
	import QRCodeLib from 'qrcode';

	/** Payload URL encoded in the QR; regenerates whenever this changes. */
	export let url = '';
	export let alt = '';

	const qrSizePx = 200;

	let dataUri = '';
	let isGenerating = false;
	/** Guards against stale async completions when `url` changes quickly. */
	let requestSeq = 0;

	async function regenerate(targetUrl: string) {
		const seq = ++requestSeq;
		if (!targetUrl) {
			dataUri = '';
			isGenerating = false;
			return;
		}
		isGenerating = true;
		try {
			const uri = await QRCodeLib.toDataURL(targetUrl, { width: qrSizePx, margin: 1 });
			if (seq === requestSeq) {
				dataUri = uri;
			}
		} catch {
			if (seq === requestSeq) {
				dataUri = '';
			}
		} finally {
			if (seq === requestSeq) {
				isGenerating = false;
			}
		}
	}

	$: regenerate(url);
</script>

<div
	class="relative inline-flex size-[200px] shrink-0 items-center justify-center rounded-md"
	aria-busy={isGenerating}
>
	{#if dataUri}
		<img
			src={dataUri}
			{alt}
			class="size-[200px] rounded-md transition-opacity duration-200 {isGenerating
				? 'opacity-40'
				: 'opacity-100'}"
			width={qrSizePx}
			height={qrSizePx}
		/>
	{:else}
		<div class="size-[200px] rounded-md bg-gray-100 dark:bg-gray-800"></div>
	{/if}

	{#if isGenerating}
		<span
			class="pointer-events-none absolute inset-0 flex items-center justify-center"
			aria-hidden="true"
		>
			<span
				class="h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"
			></span>
		</span>
	{/if}
</div>
