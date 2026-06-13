<script lang="ts">
	import { Icon } from 'svelte-icons-pack';
	import { LuBookCheck } from 'svelte-icons-pack/lu';

	import * as m from '$lib/i18n/messages';
	import Ribbon from '$lib/illustrations/Ribbon.svelte';
	import { imageUrl } from '$lib/utils/imageUrl';

	let {
		image = null,
		achievementType = null,
		name = '',
		class: klass = ''
	}: {
		image?: string | null;
		achievementType?: string | null;
		name?: string;
		class?: string;
	} = $props();
</script>

{#if image}
	<img src={imageUrl(image)} class={klass} alt={m.firm_steady_boar_imagealt({ name })} />
{:else if achievementType === 'Competency'}
	<span class={klass} aria-label={m.crisp_calm_otter_label()}>
		<Icon src={LuBookCheck} size="100%" color="currentColor" />
	</span>
{:else}
	<div class="text-gray-400 dark:text-gray-700 {klass}">
		<Ribbon />
	</div>
{/if}
