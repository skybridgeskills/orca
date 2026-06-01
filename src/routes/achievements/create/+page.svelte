<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { PageProps } from './$types';
	import AchievementForm from '$lib/partials/AchievementForm.svelte';
	import Heading from '$lib/components/Heading.svelte';

	let { data }: PageProps = $props();
	const categories = data.categories;

	let formData = {
		name: '',
		description: '',
		criteriaId: '',
		criteriaNarrative: '',
		category: 'uncategorized',
		alignments: []
	};
</script>

<Heading title={m.wet_house_owl_cook()} description={m.funny_grand_thrush_intend()} level="h1" />

<AchievementForm initialData={formData} {categories} />
