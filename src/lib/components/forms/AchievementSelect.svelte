<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { createEventDispatcher } from 'svelte';
	import { achievements } from '$lib/stores/achievementStore';
	import Icon from 'svelte-icons-pack';
	import FiSearch from 'svelte-icons-pack/fi/FiSearch.js';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { Achievement } from '@prisma/client';

	export let badgeId = '';
	export let errorMessage: string;
	export let label = 'Select achievement';
	export let description = '';
	export let inputId = 'achievementSelect_generic';
	export let inputName = inputId;
	export let achievementFilter: (a: Achievement) => boolean = (a) => true;
	let searchModalOpen = false;
	let searchQuery = '';

	const dispatch = createEventDispatcher();

	$: achievement = badgeId ? $achievements.find((a) => a.id === badgeId) : null;

	// First 3 search results
	$: searchResults = searchQuery
		? $achievements
				.filter(achievementFilter)
				.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
				.slice(0, 3)
		: $achievements.filter(achievementFilter).slice(0, 3);
</script>

<div class:isError={errorMessage}>
	<label for={inputId} class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
		{label}
	</label>
	<input
		type="hidden"
		id={inputId}
		name={inputName}
		bind:value={badgeId}
		on:blur={() => {
			dispatch('validate');
		}}
	/>
	{#if errorMessage}
		<p class="mt-2 text-sm text-red-600 dark:text-red-500">
			{errorMessage}
		</p>
	{/if}
	<!-- TODO: make this a light gray like the other label descriptions, another chance for a forminput component -->
	<p class="my-4 text-sm text-gray-900 dark:text-gray-300">
		{description}
	</p>

	{#if !badgeId}
		<Button
			submodule="secondary"
			on:click={() => {
				searchModalOpen = true;
			}}
		>
			Choose achievement
		</Button>
	{:else if achievement != null}
		<AchievementSummary {achievement} imageSize="16" linkAchievement={false}>
			<div slot="actions">
				<button
					type="button"
					class="text-sm pb-2 pr-2 text-gray-900 dark:text-white underline hover:no-underline"
					on:click={() => {
						searchModalOpen = true;
					}}
				>
					{m.changeCta()}
				</button>
				<button
					type="button"
					class="text-sm pb-2 pr-2 text-gray-900 dark:text-white underline hover:no-underline"
					on:click={() => (badgeId = '')}
				>
					{m.removeCTA()}
				</button>
			</div>
		</AchievementSummary>
	{/if}
</div>

<Modal
	visible={searchModalOpen}
	title={label}
	on:close={() => {
		searchModalOpen = false;
		searchQuery = '';
	}}
	actions={[]}
>
	<label
		for="achievementSelect_searchInput"
		class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
	>
		{description}
	</label>
	<div class="relative text-gray-900 dark:text-white">
		<div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
			<Icon src={FiSearch} size="16" color="currentColor" />
		</div>
		<input
			type="text"
			id="achievementSelect_searchInput"
			name="config_achievementRequires"
			class="pl-10 bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder={m.achievement_searchByName()}
			bind:value={searchQuery}
		/>
	</div>

	{#if searchResults.length > 0}
		<ul class="mt-4 space-y-2">
			{#each searchResults as achievement}
				<li>
					<AchievementSummary
						{achievement}
						imageSize="16"
						linkAchievement={false}
						isClickable={true}
						on:click={() => {
							badgeId = achievement.id;
							searchModalOpen = false;
							searchQuery = '';
						}}
					>
						<div slot="actions">
							<div class="pb-2 pr-2">
								<button
									type="button"
									class="text-sm text-gray-900 dark:text-white underline hover:no-underline"
									on:click={() => {
										badgeId = achievement.id;
										searchModalOpen = false;
										searchQuery = '';
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
