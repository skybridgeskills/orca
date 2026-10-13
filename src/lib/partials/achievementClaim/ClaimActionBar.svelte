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

	// The shared button's `mr-3` would push a full-width button past the edge in the column.
	const controlClass = $derived(`max-sm:mr-0 ${buttonClass}`);
</script>

{#if actions.length}
	<!-- One column on phones (the buttons are already full width there); a row from `sm` up. -->
	<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-1">
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
					class={controlClass}
				/>
			{:else}
				<Button
					text={action.label}
					submodule={action.submodule}
					id={action.controlId}
					disabled={action.disabled}
					onclick={action.onclick}
					class={controlClass}
				/>
			{/if}
		{/each}
	</div>
{/if}
