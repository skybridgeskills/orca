<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { achievementFormSchema } from '$lib/data/achievementForm';
	import ImageFileDrop from '$lib/components/ImageFileDrop.svelte';
	import type * as yup from 'yup';
	import type { Achievement, AchievementCategory, AchievementConfig } from '@prisma/client';
	import AchievementSelect from '$lib/components/forms/AchievementSelect.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import {
		achievements,
		achievementsLoading,
		fetchAchievements,
		upsertAchievement
	} from '$lib/stores/achievementStore';
	import { onMount, tick } from 'svelte';
	import { ensureLoaded } from '$lib/stores/common';
	import RadioOption from '$lib/components/forms/RadioOption.svelte';
	import FormFieldLabel from '$lib/components/forms/FormFieldLabel.svelte';
	import CollapsiblePane from '$lib/components/CollapsiblePane.svelte';

	export let categories: Array<AchievementCategory>;
	export let initialData;
	export let achievementId = '';
	let formData = {
		...initialData,
		claimable: initialData.claimable ? 'on' : 'off',
		claimableSelectedOption: initialData.claimable
			? initialData.claimRequires
				? 'badge'
				: 'public'
			: 'off',
		reviewableSelectedOption: initialData.reviewsRequired
			? initialData.reviewRequires
				? 'badge'
				: 'admin'
			: 'none',
		inviteSelectedOption: initialData.capabilities_inviteRequires ? 'badge' : 'none'
	};

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
		reviewRequires: '',
		inviteRequires: '',
		claimTemplate: ''
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
				err.inner.map((err) => {
					const errPath = err.path || err.type;
					if (errPath) errors[errPath as keyof typeof errors] = err.message;

					// assign it to itself to trigger a reactivity update
					errors = errors;

					const firstErrorEl = document?.querySelector(
						'.isError input, .isError select, .isError textarea'
					) as HTMLInputElement;
					if (firstErrorEl?.focus) firstErrorEl.focus();
				});
			});
	};

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		e.stopPropagation();

		try {
			const validationResults = await achievementFormSchema.validate(formData);
		} catch (err) {
			validate();
			return;
		}
		const formsData = new FormData(e.target as HTMLFormElement);

		// see if the form data image is a dataURI, it is this in case of new file or one loaded from DB
		const imageEdited =
			`${formData.image}`.startsWith('data:') || (!formData.image && !!initialData.image);
		formsData.append('imageEdited', `${imageEdited}`);

		if (formData['imageExtension']) formsData.append('imageExtension', formData.imageExtension);

		// Add claimTemplate to the form data
		formsData.append('claimTemplate', formData.claimTemplate || '');

		const response = await fetch($page.url, { method: 'POST', body: formsData });
		const responseText = await response.text();

		//TODO: figure out how to handle the new return type
		const result: ActionResult = deserialize(responseText);
		switch (result.type) {
			case 'failure':
				if (
					['claimRequires', 'inviteRequires', 'reviewRequires'].includes(
						result.data?.code ?? 'none'
					)
				)
					errors[result.data?.code as keyof typeof errors] = m.requirement_statusInvalid();
				break;
			case 'success':
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

				upsertAchievement(result.data?.achievement);
				goto(`/achievements/${result.data?.achievement.id}`);
				break;
			case 'redirect':
				goto(result.location);
				break;
			case 'error':
				console.error(result.error);
		}
	};

	onMount(async () => {
		await ensureLoaded(achievementsLoading, fetchAchievements);
	});

	$: {
		if (formData.reviewableSelectedOption == 'none' && formData.reviewsRequired > 0) {
			formData.reviewsRequired = 0;
		} else if (formData.reviewableSelectedOption == 'badge' && formData.reviewsRequired == 0) {
			// Reset the number of reviews required to the initial value if non-zero.
			formData.reviewsRequired = initialData.reviewsRequired || 1;
		} else if (formData.reviewableSelectedOption == 'admin' && formData.reviewsRequired != 1) {
			formData.reviewsRequired = 1;
		}

		if (formData.claimableSelectedOption == 'off') {
			formData.claimable = 'off';
		} else {
			formData.claimable = 'on';
		}
	}
</script>

<form on:submit|preventDefault={handleSubmit}>
	<div class="flex flex-col sm:flex-row gap-4 flex-grow max-w-4xl">
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
			<div class="mb-6 max-w-2xl" class:isError={errors.name}>
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
				{#if errors.name}
					<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errors.name}
					</p>
				{/if}
			</div>
			<!-- Description -->
			<div class="mb-6 max-w-2xl" class:isError={errors.description}>
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
					placeholder={m.dark_major_goat_support()}
					bind:value={formData.description}
				/>
				{#if errors.description}
					<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errors.description}
					</p>
				{/if}
			</div>
			<!-- Category -->
			<div class="mb-6 max-w-2xl" class:isError={errors.category}>
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
					{#each categories as category (category.id)}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
				{#if errors.category}
					<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errors.category}
					</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="max-w-4xl space-y-6">
		<!-- Criteria -->

		<Heading title={m.criteria()} description={m.criteria_description()} level="h3" />
		<div class="mb-6" class:isError={errors.criteriaNarrative}>
			<MarkdownEditor bind:value={formData.criteriaNarrative} />

			{#if errors.criteriaNarrative}
				<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errors.criteriaNarrative}
				</p>
			{/if}
		</div>

		<div class:isError={errors.criteriaId}>
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

		<CollapsiblePane title={m.dry_fluffy_guppy_view()}>
			<div class="flex flex-col gap-3">
				<!-- Claim Settings -->
				<div class:isError={errors.claimRequires}>
					<FormFieldLabel for="claimable">{m.claimConfiguration_allow()}</FormFieldLabel>
					<input type="hidden" name="claimable" bind:value={formData.claimable} />
					<div class="space-y-2">
						<RadioOption
							bind:selectedOption={formData.claimableSelectedOption}
							value="off"
							name="claimableSelectedOption"
							label={m.achievement_awardByInvitation()}
							id="achievementEdit_claimable_off"
						/>
						<RadioOption
							bind:selectedOption={formData.claimableSelectedOption}
							value="public"
							name="claimableSelectedOption"
							label={m.achievement_openClaimable_description()}
							id="achievementEdit_claimableSelectedOption_public"
						/>
						<RadioOption
							bind:selectedOption={formData.claimableSelectedOption}
							value="badge"
							name="claimableSelectedOption"
							id="achievementEdit_claimableSelectedOption_badge"
						>
							<span class="inline">{m.tired_top_fish_bask()}</span>
							<AchievementSelect
								badgeId={formData.claimRequires}
								on:unselected={() => {
									formData.claimable = 'off';
									formData.claimRequires = null;
								}}
								on:selected={(e) => {
									formData.claimRequires = e.detail;
								}}
								disabled={formData.claimableSelectedOption != 'badge'}
								label={m.claimConfiguration_requiredAchievement()}
								description={m.claimConfiguration_requiredAchievement_description()}
								achievementFilter={(a) => a.id != achievementId}
								inputId="achievementEdit_claimRequires"
								inputName="claimRequires"
								errorMessage={errors.claimRequires}
							>
								<span slot="invoker" class="inline" let:handler>
									{#if !formData.claimRequires}
										<button
											on:click|preventDefault={() => {
												formData.claimable = 'on';
												handler();
											}}
											class={`font-medium${
												formData.claimable == 'on'
													? ' underline hover:no-underline'
													: 'text-gray-700 dark:text-gray-500 cursor-auto'
											}`}
											tabindex={formData.claimable == 'on' ? 0 : -1}
										>
											Choose...
										</button>
									{/if}
								</span>
							</AchievementSelect>
						</RadioOption>
					</div>
					{#if errors.claimable}
						<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.claimable}</p>
					{/if}
				</div>

				<!-- Review Settings -->
				<input
					type="hidden"
					name="reviewableSelectedOption"
					bind:value={formData.reviewableSelectedOption}
				/>

				<div class:isError={errors.reviewRequires}>
					<FormFieldLabel for="config_reviewOption"
						>{m.achievementConfig_reviewRequiresLabel()}</FormFieldLabel
					>
					<div class="space-y-2">
						<RadioOption
							bind:selectedOption={formData.reviewableSelectedOption}
							value="none"
							name="config_reviewable"
							label={m.fancy_antsy_ray_gaze()}
							id="achievementEdit_reviewOption_none"
						/>
						<RadioOption
							bind:selectedOption={formData.reviewableSelectedOption}
							value="admin"
							name="config_reviewable"
							label={m.gray_fluffy_myna_pet()}
							id="achievementEdit_reviewOption_admin"
						/>
						<RadioOption
							bind:selectedOption={formData.reviewableSelectedOption}
							value="badge"
							name="config_reviewable"
							id="achievementEdit_reviewOption_badge"
						>
							<span class="inline">{m.achievementConfig_reviewRequiresLabelSpecific()}</span>
							<AchievementSelect
								badgeId={formData.reviewRequires}
								on:unselected={() => {
									if (formData.reviewableSelectedOption == 'badge') {
										// only unselect if something a badge selected
										// not "admin"
										formData.reviewableSelectedOption = 'none';
									}
									formData.reviewRequires = null;
								}}
								on:selected={(e) => {
									formData.reviewRequires = e.detail;
								}}
								disabled={formData.reviewableSelectedOption != 'badge'}
								label={m.claimConfiguration_requiredAchievement()}
								description={m.claimConfiguration_requiredAchievement_description()}
								inputId="achievementEdit_reviewRequires"
								inputName="reviewRequires"
								errorMessage={errors.reviewRequires}
							>
								<span slot="invoker" class="inline" let:handler>
									{#if !formData.reviewRequires}
										<button
											on:click|preventDefault={() => {
												formData.reviewableSelectedOption = 'badge';
												handler();
											}}
											class={`font-medium${
												formData.reviewableSelectedOption == 'badge'
													? ' underline hover:no-underline'
													: 'text-gray-700 dark:text-gray-500 cursor-auto'
											}`}
											tabindex={formData.reviewableSelectedOption == 'badge' ? 0 : -1}
										>
											{m.every_flat_lamb_favor()}
										</button>
									{/if}
								</span>
							</AchievementSelect>
						</RadioOption>
						{#if errors.reviewRequires}
							<p class="mt-2 text-sm text-red-600 dark:text-red-500">
								{errors.reviewRequires}
							</p>
						{/if}
					</div>

					<div class:isError={errors.reviewsRequired} class="mt-2">
						<FormFieldLabel
							for="achievementEdit_reviewsRequired"
							disabled={formData.reviewableSelectedOption != 'badge'}
						>
							{m.claimConfiguration_reviewsRequired()}
						</FormFieldLabel>
						<input
							type="number"
							min="0"
							max="5"
							id="achievementEdit_reviewsRequired"
							name="reviewsRequired"
							class={`w-36 bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 ${
								formData.reviewableSelectedOption == 'badge'
									? 'text-gray-900 dark:text-white'
									: 'text-gray-700 dark:text-gray-500 cursor-not-allowed'
							} dark:focus:ring-blue-500 dark:focus:border-blue-500`}
							placeholder=""
							bind:value={formData.reviewsRequired}
							on:blur={validate}
							disabled={formData.reviewableSelectedOption != 'badge'}
						/>
						{#if errors.reviewsRequired}
							<p class="mt-2 text-sm text-red-600 dark:text-red-500">
								{errors.reviewsRequired}
							</p>
						{/if}
					</div>
				</div>

				<!-- Invite Settings -->
				<div class:isError={errors.inviteRequires}>
					<FormFieldLabel for="capabilities_inviteRequires"
						>{m.achievementConfig_inviteRequiresLabel()}</FormFieldLabel
					>
					<div class="space-y-2">
						<RadioOption
							bind:selectedOption={formData.inviteSelectedOption}
							value="none"
							name="config_inviteable"
							label={m.aqua_alive_cougar_tickle()}
							id="achievementEdit_inviteOption_none"
						/>
						<RadioOption
							bind:selectedOption={formData.inviteSelectedOption}
							value="badge"
							name="config_invitable"
							id="achievementEdit_inviteOption_badge"
						>
							<span class="inline">{m.achievementConfig_requirementHoldersOf()}</span>
							<AchievementSelect
								badgeId={formData.capabilities_inviteRequires}
								on:unselected={() => {
									formData.inviteSelectedOption = 'none';
									formData.capabilities_inviteRequires = null;
									errors.inviteRequires = '';
								}}
								on:selected={(e) => {
									formData.capabilities_inviteRequires = e.detail;
									errors.inviteRequires = '';
								}}
								disabled={formData.inviteSelectedOption != 'badge'}
								label=""
								description=""
								inputId="capabilities_inviteRequires_input"
								inputName="capabilities_inviteRequires"
								errorMessage={errors.inviteRequires}
							>
								<span slot="invoker" class="inline" let:handler>
									{#if !formData.capabilities_inviteRequires}
										<button
											on:click|preventDefault={() => {
												formData.inviteSelectedOption = 'badge';
												handler();
											}}
											class={`font-medium${
												formData.capabilities_inviteRequires == 'badge'
													? ' underline hover:no-underline'
													: 'text-gray-700 dark:text-gray-500 cursor-auto'
											}`}
											tabindex={formData.capabilities_inviteRequires == 'badge' ? 0 : -1}
										>
											{m.chooseCTA()}
										</button>
									{/if}
								</span>
							</AchievementSelect>
						</RadioOption>

						{#if errors.inviteRequires}
							<p class="mt-2 text-sm text-red-600 dark:text-red-500">
								{errors.inviteRequires}
							</p>
						{/if}
					</div>
				</div>
			</div>
		</CollapsiblePane>
		<CollapsiblePane title={m.weary_legal_crossbill_approve()}>
			<div class="flex flex-col gap-3">
				<!-- Claim Template -->
				<p>
					{m.funny_warm_panther_intend()}
				</p>
				<div class:isError={errors.claimTemplate}>
					<FormFieldLabel for="claimTemplate">Claim Template</FormFieldLabel>
					<div class="mb-6">
						<MarkdownEditor bind:value={formData.claimTemplate} />

						{#if errors.claimTemplate}
							<p class="mt-2 text-sm text-red-600 dark:text-red-500">
								{errors.claimTemplate}
							</p>
						{/if}
					</div>
				</div>
			</div>
		</CollapsiblePane>
		<!-- Submit/Cancel -->
		<div class="flex items-center lg:order-2 mt-6">
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
