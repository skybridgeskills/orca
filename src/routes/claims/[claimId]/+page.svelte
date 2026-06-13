<script lang="ts">
	import { setContext } from 'svelte';

	import ActionHeading from '$lib/components/ActionHeading.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Button from '$lib/components/Button.svelte';
	import EndorsementList from '$lib/components/EndorsementList.svelte';
	import * as m from '$lib/i18n/messages';
	import ClaimDetail from '$lib/partials/achievementClaim/ClaimDetail.svelte';
	import { calculatePageAndSize } from '$lib/utils/pagination';

	import type { PageProps } from './$types';

	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	let { data }: PageProps = $props();

	// Single prop contract: normalize the loader's (claim, achievement, org)
	// into the shape `ClaimDetail` consumes for BOTH routes. `data.org` comes
	// from the root layout; `data.viewer` is P1's role, resolved server-side.
	const achievementForDetail = $derived({
		...data.achievement,
		organization: data.org,
		category: null
	});

	const breadcrumbItems = $derived([
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{
			text: data.achievement.name,
			href: `/achievements/${data.achievement.id}`
		},
		{ text: `${data.claim.user.givenName} ${data.claim.user.familyName}` }
	]);

	// setContext runs once during init; using the initial `data` is intentional.
	// svelte-ignore state_referenced_locally
	setContext('claimId', data.claim.id);
</script>

<Breadcrumbs items={breadcrumbItems} />

{#if data.suspension}
	<div class="max-w-2xl mb-3">
		<Badge
			text={data.suspension.tier === 'SITE' ? m.flat_grey_moth_global() : m.flat_grey_moth_local()}
			variant="danger"
		/>
	</div>
{/if}

<ClaimDetail
	claim={data.claim}
	achievement={achievementForDetail}
	viewer={data.viewer}
	exchangeEnabled={data.exchangeEnabled}
/>

<div class="max-w-2xl mt-2">
	<ActionHeading text={m.calm_steady_lynx_endorse({ count: data.endorsementCount })}>
		{#snippet actions()}
			<span>
				{#if data.hasProvidedEndorsement}
					<a href={resolve(`/claims/${data.claim.id}/endorse`)}
						><Button text={m.antsy_slow_robin_persuade()} /></a
					>
				{:else if data.session?.user?.id != data.claim.userId}
					<a href={resolve(`/claims/${data.claim.id}/endorse`)}
						><Button text={m.bright_gentle_cheetah_shrine()} /></a
					>
				{/if}
			</span>
		{/snippet}
	</ActionHeading>

	{#if data.claim.validFrom && !data.achievement.json?.reviewsRequired}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.shy_male_thrush_jump()}
		</p>
	{:else if data.claim.validFrom && data.achievement.json?.reviewsRequired}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.funny_piquant_guppy_deny()}
		</p>
	{:else if data.achievement.json?.reviewsRequired && data.achievement.reviewRequires}
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.curly_quiet_mantis_express({
				count: data.achievement.json?.reviewsRequired
			})}
			<a
				href={resolve(`/achievements/${data.achievement.reviewRequires.id}`)}
				class="font-bold underline hover:no-underline">{data.achievement.reviewRequires.name}</a
			>.
		</p>
	{/if}

	{#if data.endorsementCount > 0}
		<EndorsementList data={{ ...calculatePageAndSize($page.url), total: data.endorsementCount }} />
	{/if}
</div>
