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
	import { deleteCTA } from '$lib/i18n/messages';
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
		{ text: m.home(), href: '/' },
		{ text: m.achievement_other(), href: '/achievements' },
		{ text: m.category_other() }
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
	{m.categories_title()}
</h1>

<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
	{m.categories_description()}
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
					<th scope="col" class="py-3 px-6"> {m.category_name()} </th>
					<th scope="col" class="py-3 px-6"> {m.category_achievementCount()} </th>
					<th scope="col" class="py-3 px-6"> {m.category_weight()} </th>
					<th scope="col" class="py-3 px-6"> {m.action_other()} </th>
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
								<label for="update_categoryName" class="sr-only">{m.category_name()}</label>
								<input
									form="updateCategoryForm"
									type="text"
									id="update_categoryName"
									name="update_categoryName"
									bind:value={currentlyEditingCategory.name}
									class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
									placeholder={m.membership()}
									required
								/>
							</th>
							<td class="py-4 px-6">
								{category._count?.achievements}
							</td>
							<td class="py-4 px-6">
								<label for="update_weight" class="sr-only">{m.category_weight()}</label>
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
											text: m.saveCTA(),
											onClick: () => {},
											props: { type: 'submit', form: 'updateCategoryForm' }
										},
										{ text: m.cancelCTA(), onClick: () => cancelEdit(), props: {} }
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
										{ text: m.editCTA(), onClick: () => handleEditClick(category), props: {} },
										{
											text: m.deleteCTA(),
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
						<label for="create_categoryName" class="sr-only">{m.category_name()}</label>
						<input
							form="createCategoryForm"
							type="text"
							id="create_categoryName"
							name="create_categoryName"
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							placeholder={m.membership()}
							required
						/>
					</th>
					<td class="py-4 px-6">
						<!-- no achievements yet -->
					</td>
					<td class="py-4 px-6">
						<label for="create_weight" class="sr-only">{m.category_weight()}</label>
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
							>{m.createNewCTA()}</button
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
