<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';

	import * as m from '$lib/i18n/messages';
	import PublicClaimDetail from '$lib/partials/achievementClaim/PublicClaimDetail.svelte';
	import { staticImageUrlForAchievement } from '$lib/utils/imageUrl';

	import type { PageProps } from './$types';

	import { page } from '$app/stores';

	let { data }: PageProps = $props();
	const achievementWithOrgData = {
		...data.claim.achievement,
		organization: data.org
	};

	const derivedImageUrl = staticImageUrlForAchievement(achievementWithOrgData);
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

<PublicClaimDetail
	existingBadgeClaim={{
		...data.claim,
		achievement: achievementWithOrgData
	}}
/>
