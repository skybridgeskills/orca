<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import Alert from '$lib/components/Alert.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ButtonGroup from '$lib/components/ButtonGroup.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import {
		achievementCategories,
		upsertAchievementCategory,
		deleteAchievementCategory,
		fetchAchievementCategories,
		acLoading
	} from '$lib/stores/achievementCategoryStore';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { stringify } from 'uuid';
	import AchievementCriteria from '$lib/partials/achievement/AchievementCriteria.svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import type { AchievementCategory } from '@prisma/client';
	import { onMount } from 'svelte';
	import { LoadingStatus } from '$lib/stores/common';

	interface CategoryForm {
		id: string | null;
		name: string;
		weight: number;
	}

	let currentlyEditingCategory: CategoryForm = {
		id: null,
		name: '',
		weight: 1000
	};
	let deleteId: string | null;

	const handleEditClick = (category: CategoryForm) => {
		currentlyEditingCategory = {
			id: category.id,
			name: category.name,
			weight: category.weight
		};
	};
	const cancelEdit = () => {
		handleEditClick({ id: null, name: '', weight: 1000 });
	};

	let breadcrumbItems = [
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: m.antsy_grand_rabbit_gaze(), href: '/achievements' },
		{ text: m.fluffy_merry_myna_march() }
	];

	const enhanceUpsert = () => {
		currentlyEditingCategory.id = null;
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'success') upsertAchievementCategory(result.data as AchievementCategory);
		};
	};
	const enhanceDelete = () => {
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'success') deleteAchievementCategory(deleteId ?? '');
		};
	};

	onMount(() => {
		if ($acLoading == LoadingStatus.NotStarted) fetchAchievementCategories();
	});
</script>

<Breadcrumbs items={breadcrumbItems} />

<h1 class="max-w-2xl text-xl sm:text-2xl mb-3 text-gray-800 dark:text-white">
	{m.dense_frail_bat_nurture()}
</h1>

<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
	{m.sweet_serious_hound_intend()}
</p>

<div class="overflow-x-auto relative my-6">
	{#if [LoadingStatus.NotStarted, LoadingStatus.Loading].includes($acLoading)}
		<LoadingSpinner />
	{:else if $acLoading == LoadingStatus.Error}
		<Alert level="warning" message="Error loading categories" />
	{:else}
		<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
			<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
				<tr>
					<th scope="col" class="py-3 px-6"> {m.moving_serious_parrot_emerge()} </th>
					<th scope="col" class="py-3 px-6"> {m.piquant_antsy_ray_clasp()} </th>
					<th scope="col" class="py-3 px-6"> {m.deft_factual_goat_buy()} </th>
					<th scope="col" class="py-3 px-6"> {m.stout_teary_hound_support()} </th>
				</tr>
			</thead>

			<tbody>
				{#each $achievementCategories as category (category.id)}
					{#if category.id == currentlyEditingCategory.id}
						<!-- Editing Category in table row -->
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
							<th
								scope="row"
								class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white"
							>
								<input
									form="updateCategoryForm"
									type="hidden"
									id="update_categoryId"
									name="update_categoryId"
									bind:value={category.id}
								/>
								<label for="update_categoryName" class="sr-only">{m.moving_serious_parrot_emerge()}</label>
								<input
									form="updateCategoryForm"
									type="text"
									id="update_categoryName"
									name="update_categoryName"
									bind:value={currentlyEditingCategory.name}
									class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
									placeholder={m.bad_dry_pug_buy()}
									required
								/>
							</th>
							<td class="py-4 px-6">
								{category._count?.achievements}
							</td>
							<td class="py-4 px-6">
								<label for="update_weight" class="sr-only">{m.deft_factual_goat_buy()}</label>
								<input
									form="updateCategoryForm"
									type="text"
									id="update_weight"
									name="update_weight"
									bind:value={currentlyEditingCategory.weight}
									class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
									placeholder="1000"
									required
								/>
							</td>

							<td class="py-4 px-6">
								<ButtonGroup
									buttons={[
										{
											text: m.quick_safe_deer_save(),
											onClick: () => {},
											props: { type: 'submit', form: 'updateCategoryForm' }
										},
										{ text: m.calm_steady_lynx_cancel(), onClick: () => cancelEdit(), props: {} }
									]}
								/>
							</td>
						</tr>
					{:else}
						<!-- Display category info -->
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
							<th
								scope="row"
								class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white"
							>
								{category.name}
							</th>
							<td class="py-4 px-6">
								{category._count?.achievements}
							</td>
							<td class="py-4 px-6">
								{category.weight}
							</td>
							<td class="py-4 px-6">
								<ButtonGroup
									buttons={[
										{ text: m.sharp_clear_fox_edit(), onClick: () => handleEditClick(category), props: {} },
										{
											text: m.firm_steady_boar_delete(),
											onClick: () => {
												cancelEdit();
												deleteId = category.id;
											},
											props: { type: 'submit', form: 'deleteCategoryForm' }
										}
									]}
								/>
							</td>
						</tr>
					{/if}
				{/each}

				<!-- New category form as final row of table -->
				<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
					<th
						scope="row"
						class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white"
					>
						<label for="create_categoryName" class="sr-only">{m.moving_serious_parrot_emerge()}</label>
						<input
							form="createCategoryForm"
							type="text"
							id="create_categoryName"
							name="create_categoryName"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder={m.bad_dry_pug_buy()}
							required
						/>
					</th>
					<td class="py-4 px-6">
						<!-- no achievements yet -->
					</td>
					<td class="py-4 px-6">
						<label for="create_weight" class="sr-only">{m.deft_factual_goat_buy()}</label>
						<input
							form="createCategoryForm"
							type="text"
							id="create_weight"
							name="create_weight"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder="1000"
							required
						/>
					</td>
					<td class="py-4 px-6">
						<button
							form="createCategoryForm"
							type="submit"
							class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
							>{m.fresh_bright_sparrow_create()}</button
						>
					</td>
				</tr>
			</tbody>
		</table>
	{/if}
</div>

<form id="createCategoryForm" method="POST" action="?/create" use:enhance={enhanceUpsert} />
<form id="updateCategoryForm" method="POST" action="?/update" use:enhance={enhanceUpsert} />
<form id="deleteCategoryForm" method="POST" action="?/delete" use:enhance={enhanceDelete}>
	<input
		form="deleteCategoryForm"
		type="hidden"
		id="delete_categoryId"
		name="delete_categoryId"
		bind:value={deleteId}
	/>
</form>
