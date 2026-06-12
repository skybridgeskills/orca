<script lang="ts">
	import type { ClaimActionDescriptor } from '$lib/claimViewModel';
	import * as m from '$lib/i18n/messages';

	import ClaimActionBar from './ClaimActionBar.svelte';

	interface Props {
		/** Share/download descriptors (copyLink, shareQr, shareLinkedin, …). */
		actions: ClaimActionDescriptor[];
	}

	let { actions }: Props = $props();
</script>

{#if actions.length}
	<div class="max-w-2xl flex justify-between items-center mt-6 border-t border-b pt-5">
		<h2 class="text-l sm:text-xl my-4 dark:text-white">{m.early_fancy_boar_file()}</h2>
		<ClaimActionBar {actions} buttonClass="text-xs" />
	</div>
{/if}
