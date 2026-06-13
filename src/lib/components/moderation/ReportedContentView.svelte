<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { imageUrl } from '$lib/utils/imageUrl';

	// Read-only render of the reported content target. This is purely presentational;
	// the server load decides what (if anything) is visible. No links into the origin
	// org, no actions — P5 attaches moderation actions on the parent page.
	interface TargetView {
		targetType: string;
		found: boolean;
		title: string | null;
		body: string | null;
		image: string | null;
		subjectName: string | null;
		inviteeEmail: string | null;
	}

	let { target }: { target: TargetView } = $props();

	const subtitle = $derived(
		target.targetType === 'CLAIM' && target.subjectName
			? m.plain_calm_otter_claim_of({ name: target.subjectName })
			: target.targetType === 'ENDORSEMENT' && target.inviteeEmail
				? m.plain_calm_otter_endorsement_for({ email: target.inviteeEmail })
				: null
	);
</script>

<div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
	{#if !target.found}
		<p class="text-sm text-gray-500 dark:text-gray-400 italic">
			{m.plain_calm_otter_target_missing()}
		</p>
	{:else}
		<div class="flex items-start gap-4">
			{#if target.image}
				<img
					src={imageUrl(target.image)}
					alt={target.title ?? ''}
					class="h-16 w-16 rounded-sm object-contain shrink-0"
				/>
			{/if}
			<div class="min-w-0">
				{#if target.title}
					<p class="font-semibold text-gray-900 dark:text-white">{target.title}</p>
				{/if}
				{#if subtitle}
					<p class="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
				{/if}
				{#if target.body}
					<p class="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
						{target.body}
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
