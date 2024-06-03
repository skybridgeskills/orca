<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { createEventDispatcher, onMount } from 'svelte';
	import {
		achievements,
		achievementsLoading,
		fetchAchievements
	} from '$lib/stores/achievementStore';
	import Icon from 'svelte-icons-pack';
	import FiSearch from 'svelte-icons-pack/fi/FiSearch.js';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import FormFieldLabel from '$lib/components/forms/FormFieldLabel.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { Achievement } from '@prisma/client';
	import FormFieldHelperText from './FormFieldHelperText.svelte';
	import { ensureLoaded } from '$lib/stores/common';

	export let badgeId = '';
	export let disabled = false;
	export let errorMessage: string;
	export let label = 'Select achievement';
	export let description = '';
	export let inputId = 'achievementSelect_generic';
	export let inputName = inputId;
	export let achievementFilter: (a: Achievement) => boolean = (a) => true;
	let searchModalOpen = false;
	let searchQuery = '';
	let achievement: Achievement | undefined;

	const tColor = 'text-gray-900 dark:text-gray-300 hover:no-underline'; // default text color
	const dtColor = 'text-gray-400 dark:text-gray-600'; // Disabled text color

	const dispatch = createEventDispatcher();

	// First 3 search results
	$: searchResults = searchQuery
		? $achievements
				.filter(achievementFilter)
				.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
				.slice(0, 3)
		: $achievements.filter(achievementFilter).slice(0, 3);

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
		if (!achievement) dispatch('unselected');
	});
</script>

<input type="hidden" id={inputId} name={inputName} bind:value={badgeId} />

<slot name="invoker" handler={handleOpenModal}>
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
			on:click={() => {
				searchModalOpen = true;
			}}
			{disabled}
		>
			{m.achievement_chooseCTA()}
		</Button>
	{/if}
</slot>

<slot name="selected-summary">
	{#if !!badgeId && achievement != null}
		<div class="pt-2">
			<AchievementSummary {achievement} imageSize="16" linkAchievement={false} {disabled}>
				<div slot="actions">
					<button
						type="button"
						class="text-sm pb-2 pr-2 ${disabled ? dtColor : tColor} underline"
						on:click={() => {
							searchModalOpen = true;
						}}
						{disabled}
					>
						{m.changeCta()}
					</button>
					<button
						type="button"
						class="text-sm pb-2 pr-2 ${disabled ? dtColor : tColor} underline"
						on:click|preventDefault={() => {
							dispatch('unselected');
							achievement = undefined;
						}}
						{disabled}
					>
						{m.removeCTA()}
					</button>
				</div>
			</AchievementSummary>
		</div>
	{/if}
</slot>

<Modal
	visible={searchModalOpen}
	title={label}
	on:close={() => {
		searchModalOpen = false;
		searchQuery = '';
	}}
	actions={[]}
>
	<FormFieldLabel for="achievementSelect_searchInput" text={description} />
	<div class="relative text-gray-900 dark:text-white">
		<div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
			<Icon src={FiSearch} size="16" color="currentColor" />
		</div>
		<input
			type="text"
			id="achievementSelect_searchInput"
			name="claimRequires"
			class="pl-10 bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder={m.achievement_searchByName()}
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
						on:click={() => {
							dispatch('selected', a.id);
							searchModalOpen = false;
							searchQuery = '';
							achievement = a;
						}}
					>
						<div slot="actions">
							<div class="pb-2 pr-2">
								<button
									type="button"
									class="text-sm text-gray-900 dark:text-white underline hover:no-underline"
									on:click|preventDefault={() => {
										dispatch('selected', a.id);
										searchModalOpen = false;
										searchQuery = '';
										achievement = a;
									}}
								>
									Select
								</button>
							</div>
						</div>
					</AchievementSummary>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-4 text-sm text-gray-900 dark:text-gray-300">{m.achievements_noneFound()}</p>
	{/if}
</Modal>
