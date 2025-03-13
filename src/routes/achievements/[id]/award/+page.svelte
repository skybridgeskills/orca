<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import Alert from '$lib/components/Alert.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import MarkdownRender from '$lib/components/MarkdownRender.svelte';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';

	export let data: PageData;
	export let form;
	let endorsementJson: {
		narrative?: string;
		id?: string;
	};

	$: {
		if (form) endorsementJson = JSON.parse(form?.endorsement?.json ?? '{}');
	}

	let awardNarrative = '';

	const breadcrumbItems = [
		{ text: m.home(), href: '/' },
		{ text: m.achievement_other(), href: '/achievements' },
		{ text: data.achievement?.name, href: `/achievements/${data.achievement.id}` }
	];
</script>

<Breadcrumbs items={breadcrumbItems} />
<div class="max-w-2xl">
	{#if form}
		<!-- Result of form submission: a new Endorsement or a previous one-->
		<h3 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
			{m.awardedBadge()}
		</h3>

		<AchievementSummary achievement={data.achievement} linkAchievement={false} />

		{#if form.selfClaim}
			<p class="mt-4 mb-8 text-sm text-gray-500 dark:text-gray-400">
				{m.achievement_youHaveClaimed_description()}
				<a
					href={`/claims/${form.endorsement?.claim?.id}`}
					class="text-blue-700 text-underline hover:no-underline"
				>
					{m.claim_viewCTA()}
				</a>
			</p>
		{:else if form.invited}
			<p class="mt-1 mb-8 text-sm text-gray-500 dark:text-gray-400">
				{m.claim_youHaveInvited({
					inviteeEmail: form.endorsement?.inviteeEmail ?? ''
				})}
			</p>
		{:else}
			<p class="mt-1 mb-8 text-sm text-gray-500 dark:text-gray-400">
				{m.claim_youHaveAwarded({
					givenName: form.identifier?.user?.givenName ?? 'another',
					familyName: form.identifier?.user?.familyName ?? 'user'
				})}
			</p>
		{/if}

		{#if !form.selfClaim && form.created === false}
			<Alert
				message="You already recommended this person for this achievement. Previous data is shown below."
				level="warning"
			/>
		{/if}

		{#if form.endorsement}
			<div class="mb-4">
				<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
					<span class="font-bold">{m.status_created()}:</span>
					{form.endorsement?.createdAt}
				</p>
				{#if endorsementJson?.narrative}
					<p class="font-bold max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
						{m.narrative()}:
					</p>
					<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
						<MarkdownRender value={endorsementJson.narrative} />
					</p>
				{/if}
				{#if endorsementJson?.id}
					<p class="max-w-2xl mt-3 text-sm text-gray-800 dark:text-gray-400">
						<span class="font-bold">{m.evidenceURL()}:</span>
						<a href={endorsementJson.id} class="text-blue-700 text-underline hover:no-underline">
							{endorsementJson.id}
						</a>
					</p>
				{/if}
			</div>
		{/if}

		<div class="flex gap-1">
			<Button
				text={m.achievement_awardAnotherCTA()}
				submodule="secondary"
				on:click={() => {
					form = null;
				}}
			/>
			<Button href="../{data.achievement.id}" submodule="primary" text="Done" />
		</div>
	{:else}
		<!-- Submission form -->
		<Heading title={m.awardBadgeCTA()} description={m.awardBadgeCTA_description()} />

		<AchievementSummary achievement={data.achievement} />

		<form method="POST" class="mt-4">
			<div class="mb-6">
				<label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>{m.award_recipientEmail()}</label
				>
				<input
					type="email"
					id="email"
					name="email"
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="name@mycommunity.com"
					required
				/>
			</div>

			<div class="mb-6">
				<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
					{m.award_narrative_description()}
				</p>
				<label
					for="narrative"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>{m.achievement_narrative()}</label
				>
				{#if data.achievement.criteriaNarrative}
					<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
						<MarkdownRender value={data.achievement.criteriaNarrative} />
					</p>
				{/if}
				<textarea
					id="narrative"
					name="narrative"
					class="hidden"
					placeholder={m.award_narrative_placeholder()}
					bind:value={awardNarrative}
				/>
				<MarkdownEditor bind:value={awardNarrative} />
			</div>
			<div class="mb-6">
				<label
					for="evidenceUrl"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>{m.evidenceURL()}</label
				>
				<input
					type="text"
					id="evidenceUrl"
					name="evidenceUrl"
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="https://portfolio.example.com/..."
				/>
			</div>

			<button
				type="submit"
				class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
				>{m.submitCTA()}</button
			>
		</form>
	{/if}
</div>
