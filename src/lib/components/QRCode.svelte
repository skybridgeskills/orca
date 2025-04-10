<script lang="ts">
	import QRCode from 'qrcode';
	import { onMount } from 'svelte';
	interface Props {
		url?: string;
		alt?: string;
	}

	let { url = '', alt = '' }: Props = $props();
	let dataUri = $state('');

	onMount(async () => {
		dataUri = await QRCode.toDataURL(url);
	});
</script>

<img src={dataUri} {alt} />
