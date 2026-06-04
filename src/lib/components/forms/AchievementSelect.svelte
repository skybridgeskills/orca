<script lang="ts">
	import type { Achievement } from '@prisma/client';
	import { onMount, type Snippet } from 'svelte';
	import { Icon } from 'svelte-icons-pack';
	import { FiSearch } from 'svelte-icons-pack/fi';

	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import Button from '$lib/components/Button.svelte';
	import FormFieldLabel from '$lib/components/forms/FormFieldLabel.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import * as m from '$lib/i18n/messages';
	import {
		achievements,
		achievementsLoading,
		fetchAchievements
	} from '$lib/stores/achievementStore';
	import { ensureLoaded } from '$lib/stores/common';

	import FormFieldHelperText from './FormFieldHelperText.svelte';

	interface Props {
		badgeId?: string | null;
		disabled?: boolean;
		errorMessage?: string;
		label?: string;
		description?: string;
		inputId?: string;
		inputName?: string;
		achievementFilter?: (a: Achievement) => boolean;
		onselected?: (badgeId: string) => void;
		onunselected?: () => void;
		invoker?: Snippet<[() => void]>;
		selectedSummary?: Snippet;
	}

	let {
		badgeId = '',
		disabled = false,
		errorMessage = '',
		label = 'Select achievement',
		description = '',
		inputId = 'achievementSelect_generic',
		inputName = inputId,
		achievementFilter = () => true,
		onselected,
		onunselected,
		invoker,
		selectedSummary
	}: Props = $props();

	let searchModalOpen = $state(false);
	let searchQuery = $state('');
	let achievement: Achievement | undefined = $state();

	const tColor = 'text-gray-900 dark:text-gray-300 hover:no-underline'; // default text color
	const dtColor = 'text-gray-400 dark:text-gray-600'; // Disabled text color

	// First 3 search results
	const searchResults = $derived(
		searchQuery
			? $achievements
					.filter(achievementFilter)
					.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
					.slice(0, 3)
			: $achievements.filter(achievementFilter).slice(0, 3)
	);

	const handleOpenModal = () => {
		if (!disabled) {
			searchModalOpen = true;
		}
	};

	onMount(async () => {
		await ensureLoaded(achievementsLoading, fetchAchievements);
		if (badgeId) {
			achievement = $achievements.find((a) => a.id === badgeId);
		}
		if (!achievement) onunselected?.();
	});
</script>

<input type="hidden" id={inputId} name={inputName} value={badgeId} />

{#if invoker}
	{@render invoker(handleOpenModal)}
{:else}
	<FormFieldLabel for={inputId} {disabled} text={label} />
	{#if errorMessage}
		<p class="mt-2 text-sm text-red-600 dark:text-red-500">
			{errorMessage}
		</p>
	{/if}
	<!-- TODO: make this a light gray like the other label descriptions, another chance for a forminput component -->
	<FormFieldHelperText {disabled}>
		{description}
	</FormFieldHelperText>

	{#if !badgeId}
		<Button
			submodule="secondary"
			onclick={() => {
				searchModalOpen = true;
			}}
			{disabled}
		>
			{m.sparse_petty_fox_jest()}
		</Button>
	{/if}
{/if}

{#if selectedSummary}
	{@render selectedSummary()}
{:else if !!badgeId && achievement != null}
	<div class="pt-2">
		<AchievementSummary {achievement} imageSize="16" linkAchievement={false} {disabled}>
			{#snippet actions()}
				<button
					type="button"
					class="text-sm pb-2 pr-2 ${disabled ? dtColor : tColor} underline"
					onclick={() => {
						searchModalOpen = true;
					}}
					{disabled}
				>
					{m.quick_safe_deer_change()}
				</button>
				<button
					type="button"
					class="text-sm pb-2 pr-2 ${disabled ? dtColor : tColor} underline"
					onclick={(e) => {
						e.preventDefault();
						onunselected?.();
						achievement = undefined;
					}}
					{disabled}
				>
					{m.firm_clear_fox_remove()}
				</button>
			{/snippet}
		</AchievementSummary>
	</div>
{/if}

<Modal
	visible={searchModalOpen}
	title={label}
	onclose={() => {
		searchModalOpen = false;
		searchQuery = '';
	}}
	actions={[]}
>
	<FormFieldLabel for="achievementSelect_searchInput" text={description} />
	<div class="relative text-gray-900 dark:text-white">
		<div class="absolute inset-y-0 inset-s-0 flex items-center ps-3 pointer-events-none">
			<Icon src={FiSearch} size="16" color="currentColor" />
		</div>
		<input
			type="text"
			id="achievementSelect_searchInput"
			name="claimRequires"
			class="pl-10 bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder={m.house_small_sparrow_succeed()}
			bind:value={searchQuery}
		/>
	</div>

	{#if searchResults.length > 0}
		<ul class="mt-4 space-y-2">
			{#each searchResults as a (a.id)}
				<li>
					<AchievementSummary
						achievement={a}
						imageSize="16"
						linkAchievement={false}
						isClickable={true}
						onclick={() => {
							onselected?.(a.id);
							searchModalOpen = false;
							searchQuery = '';
							achievement = a;
						}}
					>
						{#snippet actions()}
							<div class="pb-2 pr-2">
								<button
									type="button"
									class="text-sm text-gray-900 dark:text-white underline hover:no-underline"
									onclick={(e) => {
										e.preventDefault();
										onselected?.(a.id);
										searchModalOpen = false;
										searchQuery = '';
										achievement = a;
									}}
								>
									Select
								</button>
							</div>
						{/snippet}
					</AchievementSummary>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-4 text-sm text-gray-900 dark:text-gray-300">{m.tidy_sunny_seahorse_relish()}</p>
	{/if}
</Modal>
