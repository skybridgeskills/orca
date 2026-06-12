<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';

	import * as m from '$lib/i18n/messages';
	import ClaimDetail from '$lib/partials/achievementClaim/ClaimDetail.svelte';
	import { staticImageUrlForAchievement } from '$lib/utils/imageUrl';

	import type { PageProps } from './$types';

	import { page } from '$app/stores';

	let { data }: PageProps = $props();
	const achievementWithOrgData = $derived({
		...data.claim.achievement,
		organization: data.org
	});

	const derivedImageUrl = $derived(staticImageUrlForAchievement(achievementWithOrgData));
</script>

<MetaTags
	title={data.org.name}
	titleTemplate="%s | ORCA Pod"
	description="{data.org.description},"
	openGraph={{
		type: 'website',
		url: $page.url.href,
		title: data.claim.achievement.name,
		description: data.claim.achievement.description,
		images: [
			{
				url: derivedImageUrl,
				width: 800,
				height: 800,
				alt: `${data.claim.achievement.name} badge image}`
			}
		]
	}}
	twitter={{
		cardType: 'summary_large_image',
		title: data.claim.achievement.name,
		description: data.claim.achievement.description,
		image: derivedImageUrl,
		imageAlt: m.firm_steady_boar_imagealt({ name: data.claim.achievement.name })
	}}
/>

<!-- Public surface: reuse the shared ClaimDetail with viewer='public'. The
	view-model yields an empty action set, so no owner affordances are exposed.
	The public loader's `achievementConfig` carries a loosely-typed `json`; the
	public view never opens the claim form (owner-only), so we present it to
	ClaimDetail's typed contract via a localized cast. -->
<ClaimDetail
	claim={data.claim}
	achievement={{
		...achievementWithOrgData,
		achievementConfig: achievementWithOrgData.achievementConfig as App.ConfigWithRelations | null
	}}
	viewer="public"
/>
