<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { achievementFormSchema } from '$lib/data/achievementForm';
	import ImageFileDrop from '$lib/components/ImageFileDrop.svelte';
	import type * as yup from 'yup';
	import type { AchievementCategory } from '@prisma/client';
	import Heading from '$lib/components/Heading.svelte';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import type { Action, ActionResult } from './$types';

	export let categories: Array<AchievementCategory>;
	export let initialData;
	let formData = { ...initialData };

	let noErrors = {
		name: '',
		description: '',
		criteriaId: '',
		criteriaNarrative: '',
		image: '',
		imageExtension: '',
		category: '',
		claimable: '',
		claimRequires: '',
		reviewsRequired: '',
		reviewRequires: ''
	};
	let errors = { ...noErrors };

	const validate = () => {
		achievementFormSchema
			.validate(formData, { abortEarly: false })
			.then(() => {
				errors = { ...noErrors };
			})
			.catch((err: yup.ValidationError) => {
				errors = { ...noErrors };
				console.log(errors);
				err.inner.map((err) => {
					errors[err.path] = err.message;
					errors = errors;
				});
			});
	};

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		try {
			const validationResults = await achievementFormSchema.validate(formData);
		} catch (err) {
			validate();
		}
		const formsData = new FormData(e.target as HTMLFormElement);

		// see if the form data image is a dataURI, it is this in case of new file or one loaded from DB
		const imageEdited =
			`${formData.image}`.startsWith('data:') || (!formData.image && !!initialData.image);
		formsData.append('imageEdited', `${imageEdited}`);

		if (formData['imageExtension']) formsData.append('imageExtension', formData.imageExtension);

		const response = await fetch($page.url, { method: 'POST', body: formsData });
		const responseText = await response.text();

		//TODO: figure out how to handle the new return type
		const result: ActionResult = deserialize(responseText);
		switch (result.type) {
			case 'failure':
			// fall through to success block
			case 'success':
				if (response.status == 400) {
					if (result.code == 'config_achievementRequires')
						errors['claimRequires'] = m.requirement_statusInvalid();
				} else {
					//read the upload url and put the image data to it.
					if (formData['image'] && result.data?.imageUploadUrl) {
						const imageAsBlob = await (await fetch(formData['image'])).blob();
						const contentType = `image/${formData['imageExtension'] === 'png' ? 'png' : 'svg+xml'}`;
						await fetch(result.data.imageUploadUrl, {
							method: 'PUT',
							body: imageAsBlob,
							headers: {
								'Content-Type': contentType
							}
						});
					}

					goto(`/achievements/${result.data?.achievement.id}`);
				}
				break;
			case 'redirect':
				goto(result.location);
				break;
			case 'error':
				console.error(result.error);
		}
	};
</script>

<form on:submit|preventDefault={handleSubmit}>
	<div class="flex flex-col sm:flex-row gap-4 flex-grow">
		<!-- Image -->
		<div class="sm:w-5/12">
			<div class:isError={errors.image}>
				<label
					for="achievementEdit_image"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400">{m.image()}</label
				>
				<ImageFileDrop
					bind:currentValue={formData.image}
					bind:errorMessage={errors.image}
					bind:imageExtension={formData.imageExtension}
				/>
				{#if errors.image}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errors.image}
					</p>
				{/if}
			</div>
		</div>

		<div class="w-full">
			<!-- Name -->
			<div class="mb-6" class:isError={errors.name}>
				<label
					for="achievementEdit_name"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400"
					>{m.achievement_name()}</label
				>
				<input
					type="text"
					id="achievementEdit_name"
					name="name"
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="Self-directed learning"
					bind:value={formData.name}
					required
				/>
				{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errors.name}
					</p>{/if}
			</div>
			<!-- Description -->
			<div class="mb-6" class:isError={errors.description}>
				<label
					for="achievementEdit_description"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400"
					>{m.description()}</label
				>
				<textarea
					id="achievementEdit_description"
					name="description"
					rows="4"
					class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="A learning process that is created and molded by the learner..."
					bind:value={formData.description}
				/>
				{#if errors.description}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errors.description}
					</p>{/if}
			</div>
			<!-- Category -->
			<div class="mb-6" class:isError={errors.category}>
				<label
					for="achievementEdit_category"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400"
					>{m.category()}</label
				>
				<select
					id="achievementEdit_category"
					name="category"
					bind:value={formData.category}
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				>
					<option value="uncategorized">- {m.uncategorized()} -</option>
					{#each categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
				{#if errors.description}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errors.description}
					</p>{/if}
			</div>
		</div>
	</div>

	<div class="max-w-2xl">
		<!-- Criteria -->

		<Heading title={m.criteria()} description={m.criteria_description()} level="h2" />
		<div class="mb-6" class:isError={errors.criteriaNarrative}>
			<MarkdownEditor bind:value={formData.criteriaNarrative} />

			{#if errors.criteriaNarrative}
				<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errors.criteriaNarrative}
				</p>
			{/if}
		</div>

		<div class="mb-6" class:isError={errors.criteriaId}>
			<label
				for="achievementEdit_url"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.criteria_url()}</label
			>
			<input
				type="text"
				id="achievementEdit_url"
				name="url"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				placeholder="https://example.com/criteria"
				bind:value={formData.criteriaId}
				on:blur={validate}
			/>
			{#if errors.criteriaId}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errors.criteriaId}
				</p>{/if}
		</div>

		<Heading title={m.claimConfiguration_heading()} level="h2" />

		<div class="mb-6" class:isError={errors.claimable}>
			<div class="flex items-center">
				<input
					bind:checked={formData.claimable}
					id="achievementEdit_claimable"
					type="checkbox"
					name="config_claimable"
					class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
				/>
				<label
					for="achievementEdit_claimable"
					class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>
					{m.claimConfiguration_allow()}
				</label>
			</div>
			{#if errors.claimable}
				<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.claimable}</p>
			{/if}
		</div>

		<div class="mb-6" class:isError={errors.claimRequires}>
			<label
				for="achievementEdit_claimRequires"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.claimConfiguration_requiredAchievement()}</label
			>
			<input
				type="text"
				id="achievementEdit_claimRequires"
				name="config_achievementRequires"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				placeholder=""
				bind:value={formData.claimRequires}
				on:blur={validate}
			/>
			{#if errors.claimRequires}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errors.claimRequires}
				</p>{/if}
			<!-- TODO: make this a light gray like the other label descriptions, another chance for a forminput component -->
			<p class="mt-4 text-sm text-gray-900 dark:text-gray-300">
				{m.claimConfiguration_requiredAchievement_description()}
			</p>
		</div>

		<div class="mb-6" class:isError={errors.reviewsRequired}>
			<label
				for="achievementEdit_reviewsRequired"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.claimConfiguration_reviewsRequired()}</label
			>
			<input
				type="number"
				min="0"
				max="5"
				id="achievementEdit_reviewsRequired"
				name="config_reviewsRequired"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				placeholder=""
				bind:value={formData.reviewsRequired}
				on:blur={validate}
			/>
			{#if errors.reviewsRequired}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errors.reviewsRequired}
				</p>{/if}

			<p class="mt-4 text-sm text-gray-900 dark:text-gray-300">
				{m.claimConfiguration_reviewsRequired_description()}
			</p>
		</div>

		<div class="mb-6" class:isError={errors.reviewRequires}>
			<label
				for="achievementEdit_reviewRequires"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.claimConfiguration_reviewRequires()}</label
			>
			<input
				type="text"
				id="achievementEdit_reviewRequires"
				name="config_reviewRequires"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				placeholder=""
				bind:value={formData.reviewRequires}
				on:blur={validate}
			/>
			{#if errors.reviewRequires}
				<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errors.reviewRequires}
				</p>
			{/if}

			<p class="mt-4 text-sm text-gray-900 dark:text-gray-300">
				{m.claimConfiguration_reviewRequires_description()}
			</p>
		</div>

		<div class="flex items-center lg:order-2">
			<button
				type="submit"
				class="mr-3 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
				>{m.submitCTA()}</button
			>
			<a
				href="/achievements"
				class="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800"
				>{m.cancelCTA()}</a
			>
		</div>
	</div>
</form>

<style lang="postcss" global>
	.isError label {
		@apply text-red-700;
	}
	.dark .isError label {
		@apply text-red-500;
	}

	.isError input {
		@apply bg-red-50 border-red-500 text-red-900 placeholder-red-300;
	}
	.isError input:focus {
		@apply border-red-500;
	}
	.dark .isError input {
		@apply bg-red-100 border-red-400;
	}
</style>
