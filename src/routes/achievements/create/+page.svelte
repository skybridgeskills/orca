<script lang="ts">
	import Heading from '$lib/components/Heading.svelte';
	import * as m from '$lib/i18n/messages';
	import AchievementForm from '$lib/partials/AchievementForm.svelte';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const categories = $derived(data.categories);

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

<AchievementForm initialData={formData} {categories} members={data.members} />
