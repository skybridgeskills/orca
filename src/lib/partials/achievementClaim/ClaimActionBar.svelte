<script lang="ts">
	import type { ClaimActionDescriptor } from '$lib/claimViewModel';
	import Button from '$lib/components/Button.svelte';
	import DownloadButton from '$lib/components/DownloadButton.svelte';
	import * as m from '$lib/i18n/messages';

	interface Props {
		actions: ClaimActionDescriptor[];
		/** Extra classes applied to each rendered control. */
		buttonClass?: string;
	}

	let { actions, buttonClass = '' }: Props = $props();
</script>

{#if actions.length}
	<div class="flex gap-1">
		{#each actions as action (action.id)}
			{#if action.id === 'shareLinkedin'}
				<!-- Preserve the original LinkedIn "add to profile" image link markup. -->
				<a
					href={action.href}
					rel="external noopener noreferrer"
					{...action.moreProps}
					class="flex items-center focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 focus-visible:outline-hidden"
				>
					<img src="/linkedin-add-to-profile-button.png" alt={m.every_watery_kite_view()} />
				</a>
			{:else if action.downloadUrl}
				<DownloadButton
					sourceUrl={action.downloadUrl}
					text={action.label}
					submodule={action.submodule}
					id={action.controlId}
					fileName={action.downloadFileName}
					class={buttonClass}
				/>
			{:else}
				<Button
					text={action.label}
					submodule={action.submodule}
					id={action.controlId}
					disabled={action.disabled}
					onclick={action.onclick}
					class={buttonClass}
				/>
			{/if}
		{/each}
	</div>
{/if}
