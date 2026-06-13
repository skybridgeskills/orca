<script lang="ts">
	import type { AchievementClaim } from '@prisma/client';
	import type { Snippet } from 'svelte';

	import type { ViewerRole } from '$lib/claimViewModel';
	import * as m from '$lib/i18n/messages';

	interface Props {
		claim: Pick<AchievementClaim, 'claimStatus'> & {
			user?: { givenName: string | null; familyName: string | null } | null;
		};
		viewer: ViewerRole;
		/**
		 * P4 seam: an authorized-viewer "why is this visible" indicator and (for the
		 * owner) the `VisibilityControl` editor mount here, beneath the title. P3
		 * leaves this region empty; P4 drops its UI in via this snippet without
		 * touching `ClaimDetail`'s layout.
		 */
		visibility?: Snippet;
		/**
		 * P2: a "…" report-content menu rendered alongside the title. Available to
		 * any viewer of the claim. Supplied by `ClaimDetail`, which owns the modal
		 * state shared with the public surface.
		 */
		report?: Snippet;
	}

	let { claim, viewer, visibility, report }: Props = $props();

	// Title + lede copy, preserved verbatim from the per-status / per-viewer
	// partials being replaced:
	//   owner   ACCEPTED   → swift_patchy_thrush_support / patchy_silly_guppy_jump
	//   owner   REJECTED   → petty_plane_marten_view (no lede; warning handled below)
	//   owner   UNACCEPTED → sharp_sea_panther_scold / ok_bold_oryx_drip
	//   non-owner (any)    → quick_clear_owl_otherbadge / smooth_calm_guppy_ask
	const isOwner = $derived(viewer === 'owner');

	const title = $derived.by(() => {
		if (!isOwner) {
			return m.quick_clear_owl_otherbadge({
				givenName: claim.user?.givenName ?? '',
				familyName: claim.user?.familyName ?? ''
			});
		}
		switch (claim.claimStatus) {
			case 'ACCEPTED':
				return m.swift_patchy_thrush_support();
			case 'REJECTED':
				return m.petty_plane_marten_view();
			case 'UNACCEPTED':
				return m.sharp_sea_panther_scold();
			default:
				return m.swift_patchy_thrush_support();
		}
	});

	const lede = $derived.by(() => {
		if (!isOwner) return m.smooth_calm_guppy_ask();
		switch (claim.claimStatus) {
			case 'ACCEPTED':
				return m.patchy_silly_guppy_jump();
			case 'UNACCEPTED':
				return m.ok_bold_oryx_drip();
			default:
				return '';
		}
	});
</script>

<div class="flex justify-between items-start gap-2">
	<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">{title}</h1>
	{@render report?.()}
</div>

{#if lede}
	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">{lede}</p>
{/if}

{@render visibility?.()}
