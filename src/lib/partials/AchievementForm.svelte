<script lang="ts">
	import type { AchievementCategory } from '@prisma/client';
	import type { ActionResult } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import type * as yup from 'yup';

	import CollapsiblePane from '$lib/components/CollapsiblePane.svelte';
	import AchievementSelect from '$lib/components/forms/AchievementSelect.svelte';
	import AlignmentInput from '$lib/components/forms/AlignmentInput.svelte';
	import FormFieldLabel from '$lib/components/forms/FormFieldLabel.svelte';
	import RadioOption from '$lib/components/forms/RadioOption.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import ImageFileDrop from '$lib/components/ImageFileDrop.svelte';
	import MarkdownEditor from '$lib/components/markdown-editor/MarkdownEditor.svelte';
	import { achievementFormSchema } from '$lib/data/achievementForm';
	import type { Alignment } from '$lib/data/alignment';
	import * as m from '$lib/i18n/messages';
	import {
		achievementsLoading,
		fetchAchievements,
		upsertAchievement
	} from '$lib/stores/achievementStore';
	import { ensureLoaded } from '$lib/stores/common';

	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	// TODO Clean up the initialData type
	interface InitialData {
		name?: string;
		description?: string;
		criteriaId?: string | null;
		criteriaNarrative?: string | null;
		category?: string;
		image?: string | null;
		imageExtension?: string | null;
		claimable?: boolean | string;
		claimRequires?: string | null;
		reviewsRequired?: number;
		reviewRequires?: string | null;
		inviteRequires?: string | null;
		capabilities_inviteRequires?: string | null;
		claimTemplate?: string | null;
		alignments?: Array<Alignment>;
	}

	interface Props {
		categories: Array<AchievementCategory>;
		initialData: InitialData;
		achievementId?: string;
	}

	let { categories, initialData, achievementId = '' }: Props = $props();

	// Seed the form once from `initialData`. Reading the prop inside this closure
	// (rather than directly at the `$state(...)` declaration) keeps the form's
	// mutable state independent of upstream changes while avoiding
	// `state_referenced_locally`.
	const initialFormData = () => ({
		...initialData,
		image: initialData.image ?? null,
		imageExtension: initialData.imageExtension ?? null,
		criteriaId: initialData.criteriaId ?? '',
		criteriaNarrative: initialData.criteriaNarrative ?? '',
		reviewsRequired: initialData.reviewsRequired ?? 0,
		claimRequires: initialData.claimRequires ?? null,
		reviewRequires: initialData.reviewRequires ?? null,
		inviteRequires: initialData.inviteRequires ?? null,
		capabilities_inviteRequires: initialData.capabilities_inviteRequires ?? null,
		claimTemplate: initialData.claimTemplate ?? '',
		alignments: initialData.alignments || [],
		// claim template toggle: enabled when there is an initial template
		claimTemplate_enabled: !!initialData.claimTemplate,
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
	});

	let formData = $state(initialFormData());

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
		claimTemplate: '',
		alignments: ''
	};
	let errors = $state({ ...noErrors });

	const validate = () => {
		achievementFormSchema
			.validate(formData, { abortEarly: false })
			.then(() => {
				errors = { ...noErrors };
			})
			.catch((err: yup.ValidationError) => {
				const next = { ...noErrors };
				err.inner.map((err) => {
					const errPath = err.path || err.type;
					if (errPath) next[errPath as keyof typeof next] = err.message;
				});
				errors = { ...next };

				const firstErrorEl = document?.querySelector(
					'.isError input, .isError select, .isError textarea'
				) as HTMLInputElement;
				if (firstErrorEl?.focus) firstErrorEl.focus();
			});
	};

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		e.stopPropagation();

		try {
			await achievementFormSchema.validate(formData);
		} catch {
			validate();
			return;
		}
		const formsData = new FormData(e.target as HTMLFormElement);
		formsData.delete('md'); // Remove input added by Carta editor if present.

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
				if (
					['claimRequires', 'inviteRequires', 'reviewRequires'].includes(
						result.data?.code ?? 'none'
					)
				)
					errors[result.data?.code as keyof typeof errors] = m.great_late_sparrow_fry();
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
				goto(resolve(`/achievements/${result.data?.achievement.id}`));
				break;
			case 'redirect':
				goto(resolve(result.location));
				break;
			case 'error':
				console.error(result.error);
		}
	};

	function addAlignment() {
		const next: Alignment = { targetUrl: '', targetName: '' };
		formData.alignments = [...formData.alignments, next];
	}

	function removeAlignment(index: number) {
		formData.alignments = formData.alignments.filter(
			(_alignment: Alignment, i: number) => i !== index
		);
	}

	function hasAlignments(): boolean {
		return formData.alignments.length > 0;
	}

	onMount(async () => {
		await ensureLoaded(achievementsLoading, fetchAchievements);
	});

	// State-coupling between the radio selections and the numeric/hidden form
	// fields they drive. The source values (`reviewableSelectedOption`,
	// `claimableSelectedOption`) are mutated through `bind:selectedOption` on the
	// RadioOption child (a `$bindable` with no change-callback) and through the
	// invoker buttons, so there is no single handler to fold this into without
	// refactoring the form's logic. Kept as a single `$effect` to preserve the
	// original `$:` behavior exactly. TODO(svelte5): revisit if RadioOption gains
	// an onchange callback so this can move into handlers.
	$effect(() => {
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
	});
</script>

<form onsubmit={handleSubmit}>
	<div class="flex flex-col sm:flex-row gap-4 grow max-w-4xl">
		<!-- Image -->
		<div class="sm:w-5/12">
			<div class:isError={errors.image}>
				<label
					for="achievementEdit_image"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400"
					>{m.vivid_dark_pug_file()}</label
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
					>{m.grand_true_lynx_whisper()}</label
				>
				<input
					type="text"
					id="achievementEdit_name"
					name="name"
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder={m.silly_jackal_example_achievementname()}
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
					>{m.kind_mellow_pug_enchant()}</label
				>
				<textarea
					id="achievementEdit_description"
					name="description"
					rows="4"
					class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder={m.dark_major_goat_support()}
					bind:value={formData.description}
				></textarea>
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
					>{m.serious_gentle_boar_nurture()}</label
				>
				<select
					id="achievementEdit_category"
					name="category"
					bind:value={formData.category}
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				>
					<option value="uncategorized">- {m.light_early_owl_shrine()} -</option>
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

		<Heading
			title={m.lower_piquant_lemur_grin()}
			description={m.pink_crazy_robin_gaze()}
			level="h3"
		/>
		<div class="mb-6" class:isError={errors.criteriaNarrative}>
			<MarkdownEditor bind:value={formData.criteriaNarrative} inputName="criteriaNarrative" />

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
				>{m.deft_stout_panther_nurture()}</label
			>
			<input
				type="text"
				id="achievementEdit_url"
				name="url"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				placeholder="https://example.com/criteria"
				bind:value={formData.criteriaId}
				onblur={validate}
			/>
			{#if errors.criteriaId}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errors.criteriaId}
				</p>{/if}
		</div>

		<CollapsiblePane title={m.dry_fluffy_guppy_view()}>
			<div class="flex flex-col gap-3">
				<!-- Claim Settings -->
				<div class:isError={errors.claimRequires}>
					<FormFieldLabel for="claimable">{m.bright_swift_eagle_allow()}</FormFieldLabel>
					<input type="hidden" name="claimable" bind:value={formData.claimable} />
					<div class="space-y-2">
						<RadioOption
							bind:selectedOption={formData.claimableSelectedOption}
							value="off"
							name="claimableSelectedOption"
							label={m.each_funny_eagle_pause()}
							id="achievementEdit_claimable_off"
						/>
						<RadioOption
							bind:selectedOption={formData.claimableSelectedOption}
							value="public"
							name="claimableSelectedOption"
							label={m.sharp_fluffy_mantis_delight()}
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
								onunselected={() => {
									formData.claimable = 'off';
									formData.claimRequires = null;
								}}
								onselected={(id) => {
									formData.claimRequires = id;
								}}
								disabled={formData.claimableSelectedOption != 'badge'}
								label={m.quick_clear_owl_required()}
								description={m.sharp_clear_fox_requireddesc()}
								achievementFilter={(a) => a.id != achievementId}
								inputId="achievementEdit_claimRequires"
								inputName="claimRequires"
								errorMessage={errors.claimRequires}
							>
								{#snippet invoker(handler)}
									<span class="inline">
										{#if !formData.claimRequires}
											<button
												onclick={(e) => {
													e.preventDefault();
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
								{/snippet}
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
					<FormFieldLabel for="config_reviewOption">{m.firm_clear_fox_reviewlabel()}</FormFieldLabel
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
							<span class="inline">{m.quick_safe_deer_reviewspec()}</span>
							<AchievementSelect
								badgeId={formData.reviewRequires}
								onunselected={() => {
									if (formData.reviewableSelectedOption == 'badge') {
										// only unselect if something a badge selected
										// not "admin"
										formData.reviewableSelectedOption = 'none';
									}
									formData.reviewRequires = null;
								}}
								onselected={(id) => {
									formData.reviewRequires = id;
								}}
								disabled={formData.reviewableSelectedOption != 'badge'}
								label={m.quick_clear_owl_required()}
								description={m.sharp_clear_fox_requireddesc()}
								inputId="achievementEdit_reviewRequires"
								inputName="reviewRequires"
								errorMessage={errors.reviewRequires}
							>
								{#snippet invoker(handler)}
									<span class="inline">
										{#if !formData.reviewRequires}
											<button
												onclick={(e) => {
													e.preventDefault();
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
								{/snippet}
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
							{m.firm_steady_boar_reviews()}
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
							onblur={validate}
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
						>{m.sharp_quiet_panther_invitelabel()}</FormFieldLabel
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
							<span class="inline">{m.warm_tangy_deer_holders()}</span>
							<AchievementSelect
								badgeId={formData.capabilities_inviteRequires}
								onunselected={() => {
									formData.inviteSelectedOption = 'none';
									formData.capabilities_inviteRequires = null;
									errors.inviteRequires = '';
								}}
								onselected={(id) => {
									formData.capabilities_inviteRequires = id;
									errors.inviteRequires = '';
								}}
								disabled={formData.inviteSelectedOption != 'badge'}
								label=""
								description=""
								inputId="capabilities_inviteRequires_input"
								inputName="capabilities_inviteRequires"
								errorMessage={errors.inviteRequires}
							>
								{#snippet invoker(handler)}
									<span class="inline">
										{#if !formData.capabilities_inviteRequires}
											<button
												onclick={(e) => {
													e.preventDefault();
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
												{m.bright_swift_eagle_choose()}
											</button>
										{/if}
									</span>
								{/snippet}
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
			{#snippet buttonExtra()}
				<div>
					{#if formData.claimableSelectedOption != 'off' || formData.reviewableSelectedOption != 'none' || formData.inviteSelectedOption != 'none'}
						<!-- IF any of the claim and review settings are not default -->
						<p class="text-sm text-gray-500 dark:text-gray-400 italic">
							{m.sparse_happy_kite_march()}
						</p>
					{/if}
				</div>
			{/snippet}
			{#snippet whenClosed()}
				<input type="hidden" name="claimable" value={formData.claimable} />
				<input
					type="hidden"
					name="claimableSelectedOption"
					value={formData.claimableSelectedOption}
				/>
				<input type="hidden" name="claimRequires" bind:value={formData.claimRequires} />

				<input
					type="hidden"
					name="config_reviewable"
					bind:value={formData.reviewableSelectedOption}
				/>
				<input type="hidden" name="reviewRequires" bind:value={formData.reviewRequires} />
				<input type="hidden" name="reviewsRequired" bind:value={formData.reviewsRequired} />

				<input
					type="hidden"
					name="inviteSelectedOption"
					bind:value={formData.inviteSelectedOption}
				/>
				<input type="hidden" name="inviteRequires" bind:value={formData.inviteRequires} />
				<input
					type="hidden"
					name="capabilities_inviteRequires"
					bind:value={formData.capabilities_inviteRequires}
				/>
			{/snippet}
		</CollapsiblePane>
		<CollapsiblePane title={m.weary_legal_crossbill_approve()}>
			<div class="flex flex-col gap-3">
				<!-- Claim Template -->
				<p class="text-sm">
					{m.funny_warm_panther_intend()}
				</p>
				<div class:isError={errors.claimTemplate}>
					<div class="flex items-center justify-between">
						<FormFieldLabel for="claimTemplate">{m.weary_legal_crossbill_approve()}</FormFieldLabel>
						<label class="inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								class="sr-only"
								bind:checked={formData.claimTemplate_enabled}
								name="claimTemplate_enabled"
							/>
							<div
								class={`relative w-11 h-6 rounded-full ${
									formData.claimTemplate_enabled
										? 'bg-blue-600 dark:bg-blue-600'
										: 'bg-gray-200 dark:bg-gray-700'
								}`}
							>
								<div
									class={`absolute top-[2px] inset-s-[2px] bg-white border rounded-full h-5 w-5 transition-all ${
										formData.claimTemplate_enabled
											? 'translate-x-5 border-white'
											: 'border-gray-300'
									}`}
								></div>
							</div>
							<span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300"
								>{formData.claimTemplate_enabled
									? m.each_least_parrot_rest()
									: m.upper_legal_marten_lead()}</span
							>
						</label>
					</div>
					<div class="mb-6 mt-3">
						<MarkdownEditor
							bind:value={formData.claimTemplate}
							inputName="claimTemplate"
							disabled={!formData.claimTemplate_enabled}
						/>

						{#if errors.claimTemplate}
							<p class="mt-2 text-sm text-red-600 dark:text-red-500">
								{errors.claimTemplate}
							</p>
						{/if}
					</div>
				</div>
			</div>
			{#snippet buttonExtra()}
				<div>
					{#if formData.claimTemplate_enabled}
						<p class="text-sm text-gray-500 dark:text-gray-400 italic">
							{m.early_house_bat_climb()}
						</p>
					{/if}
				</div>
			{/snippet}
			{#snippet whenClosed()}
				<input
					type="hidden"
					name="claimTemplate_enabled"
					value={formData.claimTemplate_enabled ? 'on' : 'off'}
				/>
				<input type="hidden" name="claimTemplate" value={formData.claimTemplate} />
			{/snippet}
		</CollapsiblePane>
		<CollapsiblePane title={m.soft_bold_moose_climb()} open={hasAlignments()}>
			<div class="flex flex-col gap-3">
				<p class="text-sm text-gray-600 dark:text-gray-400">
					{m.quiet_wise_heron_glide()}
				</p>

				{#if formData.alignments.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400 italic">
						{m.gentle_clear_fox_stare()}
					</p>
				{:else}
					{#each formData.alignments as alignment, index (index)}
						<AlignmentInput {alignment} {index} onRemove={() => removeAlignment(index)} />
					{/each}
				{/if}

				<button
					type="button"
					onclick={addAlignment}
					class="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
				>
					+ {m.calm_brave_bear_rise()}
				</button>
			</div>

			{#snippet buttonExtra()}
				<div>
					{#if hasAlignments()}
						<p class="text-sm text-gray-500 dark:text-gray-400 italic">
							{m.swift_noble_deer_leap({ count: formData.alignments.length })}
						</p>
					{/if}
				</div>
			{/snippet}

			{#snippet whenClosed()}
				{#each formData.alignments as alignment, index (index)}
					<input type="hidden" name="alignment[{index}].targetUrl" value={alignment.targetUrl} />
					<input type="hidden" name="alignment[{index}].targetName" value={alignment.targetName} />
					{#if alignment.targetDescription}
						<input
							type="hidden"
							name="alignment[{index}].targetDescription"
							value={alignment.targetDescription}
						/>
					{/if}
					{#if alignment.targetCode}
						<input
							type="hidden"
							name="alignment[{index}].targetCode"
							value={alignment.targetCode}
						/>
					{/if}
				{/each}
			{/snippet}
		</CollapsiblePane>
		<!-- Submit/Cancel -->
		<div class="flex items-center lg:order-2 mt-6">
			<button
				type="submit"
				class="mr-3 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
				>{m.bold_swift_eagle_submit()}</button
			>
			<a
				href={resolve('/achievements')}
				class="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-hidden dark:focus:ring-gray-800"
				>{m.calm_steady_lynx_cancel()}</a
			>
		</div>
	</div>
</form>

<style lang="postcss">
	@reference '../../app.css';

	.isError label {
		@apply text-red-700;
	}
	:global(.dark) {
		.isError label {
			@apply text-red-500;
		}
		.isError input {
			@apply bg-red-100 border-red-400;
		}
	}

	.isError input {
		@apply bg-red-50 border-red-500 text-red-900 placeholder:text-red-300;
	}
	.isError input:focus {
		@apply border-red-500;
	}
</style>
