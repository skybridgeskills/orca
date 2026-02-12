<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { ClaimStatus } from '@prisma/client';

	export let status: ClaimStatus;
	let calculatedStatus: ClaimStatus | 'UNDER_REVIEW';
	export let validFrom: Date | null = null;
	export let validUntil: Date | null = null;
	export let absolute = false;

	const statusColor = {
		ACCEPTED: 'border-r-lime-500 dark:border-r-lime-600',
		REJECTED: 'border-r-red-500 dark:border-r-red-600',
		UNACCEPTED: 'border-r-yellow-500 dark:border-r-yellow-600',
		UNDER_REVIEW: 'border-r-orange-500 dark:border-r-orange-600'
	};
	const statusText = {
		ACCEPTED: m.bright_swift_eagle_soar(),
		REJECTED: m.sharp_clear_fox_deny(),
		UNACCEPTED: m.clear_clear_turtle_cook(),
		UNDER_REVIEW: m.mad_fancy_penguin_read()
	};

	$: calculatedStatus =
		(validFrom && !validUntil) || (validFrom && validUntil && new Date() > validUntil)
			? status
			: 'UNDER_REVIEW';
</script>

{#if status}
	<div
		class="{absolute
			? 'absolute top-0 right-0 rounded-tr-lg rounded-bl-lg border-t-0'
			: 'inline-block rounded-lg'} border border-r-4 border-gray-200 dark:border-gray-600 p-1 px-2 bg-white dark:text-gray-300 text-sm dark:bg-gray-700 {statusColor[
			calculatedStatus
		]}"
	>
		{statusText[calculatedStatus]}
	</div>
{/if}
