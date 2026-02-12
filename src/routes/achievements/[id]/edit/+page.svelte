<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { ActionData, PageData } from './$types';
	import AchievementForm from '$lib/partials/AchievementForm.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { imageExtension } from '$lib/utils/imageUrl';

	// export let form: ActionData;
	export let data: PageData;
	const categories = data.categories;

	let formData = {
		name: data.achievement.name,
		description: data.achievement.description,
		criteriaId: data.achievement.criteriaId,
		criteriaNarrative: data.achievement.criteriaNarrative,
		image: data.achievement.image,
		imageExtension: data.achievement.image ? imageExtension(data.achievement.image) : null,
		category: data.achievement.categoryId || 'uncategorized',

		claimable: data.achievement.achievementConfig?.claimable || false,
		claimRequires: data.achievement.achievementConfig?.claimRequiresId,
		reviewsRequired: data.achievement.achievementConfig?.reviewsRequired || 0,
		reviewRequires: data.achievement.achievementConfig?.reviewRequiresId,
		capabilities_inviteRequires:
			data.achievement.achievementConfig?.json?.capabilities?.inviteRequires || '',
		claimTemplate: data.achievement.achievementConfig?.json?.claimTemplate || ''
	};

	let breadcrumbItems = [
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: m.antsy_grand_rabbit_gaze(), href: '/achievements' },
		{ text: data.achievement.name }
	];
</script>

<Breadcrumbs items={breadcrumbItems} />

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">{m.smooth_merry_ostrich_startle()}</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
	{m.ok_direct_kite_gaze()}
</p>

<AchievementForm achievementId={data.achievement.id} initialData={formData} {categories} />
