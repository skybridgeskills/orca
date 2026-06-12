<script lang="ts">
	import type { Achievement } from '@prisma/client';

	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { alignmentRowsFromAchievementJson } from '$lib/data/alignment';
	import * as m from '$lib/i18n/messages';
	import AchievementForm from '$lib/partials/AchievementForm.svelte';
	import { imageExtension } from '$lib/utils/imageUrl';

	import type { PageProps } from './$types';

	const alignmentsFromJson = (json: Achievement['json']) => alignmentRowsFromAchievementJson(json);

	let { data }: PageProps = $props();
	const categories = $derived(data.categories);

	const formData = $derived({
		name: data.achievement.name,
		description: data.achievement.description,
		criteriaId: data.achievement.criteriaId,
		criteriaNarrative: data.achievement.criteriaNarrative,
		image: data.achievement.image,
		imageExtension: data.achievement.image ? imageExtension(data.achievement.image) : null,
		category: data.achievement.categoryId || 'uncategorized',

		claimable: data.achievement.claimable || false,
		claimRequires: data.achievement.claimRequiresId,
		reviewsRequired: data.achievement.json?.reviewsRequired || 0,
		reviewRequires: data.achievement.reviewRequiresId,
		capabilities_inviteRequires: data.achievement.json?.capabilities?.inviteRequires || '',
		claimTemplate: data.achievement.json?.claimTemplate || '',
		stewards: data.achievement.json?.stewards ?? [],
		resultDescriptions: (data.achievement.json?.resultDescriptions ?? []).map((rd) => ({
			id: rd.id,
			name: rd.name,
			allowedValue: rd.allowedValue
		})),
		alignments: alignmentsFromJson(data.achievement.json)
	});

	const breadcrumbItems = $derived([
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: m.antsy_grand_rabbit_gaze(), href: '/achievements' },
		{ text: data.achievement.name }
	]);
</script>

<Breadcrumbs items={breadcrumbItems} />

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">{m.smooth_merry_ostrich_startle()}</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
	{m.ok_direct_kite_gaze()}
</p>

<AchievementForm
	achievementId={data.achievement.id}
	initialData={formData}
	{categories}
	members={data.members}
/>
