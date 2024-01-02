<script lang="ts">
	import QRCode from 'qrcode';
	import { onMount } from 'svelte';
	export let url = '';
	export let alt = '';
	let dataUri = '';

	onMount(async () => {
		dataUri = await QRCode.toDataURL(url);
	});
</script>

<img src={dataUri} {alt} />
