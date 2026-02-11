<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type { Achievement, AchievementClaim, Identifier } from '@prisma/client';
	import { session } from '$lib/stores/sessionStore';
	import {
		claimEmail,
		claimId,
		claimNarrative,
		claimPending,
		claimUrl,
		inviteId
	} from '$lib/stores/activeClaimStore';
	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { error } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import MarkdownRender from '$lib/components/MarkdownRender.svelte';
	export let existingBadgeClaim: AchievementClaim | null = null;
	export let achievement: Achievement;
	export let achievementConfig: App.AchievementConfig | null = null;
	export let claimIntent: 'ACCEPTED' | 'UNACCEPTED' | 'REJECTED' = 'ACCEPTED';
	const userIdentifiers: Identifier[] = $page.data.user?.identifiers || [];
	const userEmails = userIdentifiers.filter((iden) => iden.type == 'EMAIL');

	export let handleSubmit = async (e: SubmitEvent) => {
		if (
			!$session?.user &&
			($inviteId || (achievementConfig?.claimable && !achievementConfig?.claimRequiresId))
		) {
			// User is unauthenticated, so needs to create an invite, then prove email address / create a session, but then can submit a claim
			e.preventDefault();
			$claimId = achievement.id;
			$claimPending = true;

			if (achievementConfig?.claimable && !achievementConfig?.claimRequiresId) {
				const formData = new FormData();
				formData.append('email', $claimEmail);
				formData.append('narrative', 'Self-invitation of open claiming badge');
				const response = await fetch(`/achievements/${achievement.id}/award`, {
					method: 'POST',
					body: formData
				});
				if (response.status != 200) {
					throw error(400, m.factual_petty_marten_startle());
				} else {
					const responseData = deserialize(await response.text());
					if (responseData && typeof responseData === 'object' && 'data' in responseData) {
						const data = responseData.data as { endorsement?: { id?: string } };
						$inviteId = data?.endorsement?.id ?? '';
					}
				}
			}
			goto('/login');
		} else {
			setTimeout(() => {
				$claimEmail = userEmails[0]?.identifier || '';
				$claimNarrative = '';
				$claimUrl = '';
				$claimPending = false;
			}, 100);
			// Bubble through to default form handling otherwise after setting up the form to be reset.
		}
	};
	export let handleCancel: () => void;

	const maybeSubmit = () => {
		if ($claimPending && $session?.user) {
			// Proceed to submit the claim form if the user has completed login flow and is back.
			const submitButton = document.getElementById('claimFormSubmitButton');
			if (submitButton instanceof HTMLElement) submitButton.click();
		}
	};

	onMount(() => {
		if (!$claimEmail) $claimEmail = userEmails[0]?.identifier || '';
		if ($claimId && $claimId != $page.params.id) {
			// Reset previous claim data
			$claimEmail = userEmails[0]?.identifier || '';
			$claimNarrative = '';
			$claimUrl = '';
			$claimPending = false;
			$inviteId = '';
		} else {
			maybeSubmit();
		}

		if (existingBadgeClaim) {
			const claimJson = JSON.parse(existingBadgeClaim.json?.toString() || '{}') || {};

			// Priority: Existing claim narrative, template narrative, or empty string
			$claimNarrative = claimJson.narrative || achievementConfig?.json?.claimTemplate || '';
			$claimUrl = claimJson.id ?? '';
		} else if (!existingBadgeClaim && !$claimPending) {
			$claimNarrative = achievementConfig?.json?.claimTemplate ?? '';
			$claimUrl = '';
		}
	});

	$: {
		if ($session?.user) maybeSubmit();
	}
</script>

<form
	method="POST"
	action={existingBadgeClaim
		? `/achievements/${achievement.id}/claim?/updateClaim`
		: `/achievements/${achievement.id}/claim?/claim`}
	class="max-w-2xl"
	on:submit={handleSubmit}
>
	<input type="hidden" name="claimStatus" value={claimIntent} />
	<input type="hidden" name="inviteId" value={$inviteId} />

	{#if claimIntent == 'ACCEPTED'}
		<div class="mb-6">
			<label
				for="identifier"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.flat_weary_pug_describe()}</label
			>
			{#if userIdentifiers.length}
				<select
					id="identifier_select"
					name="identifier"
					bind:value={$claimEmail}
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				>
					{#each userEmails as identifier, i (identifier.id)}
						<option value={identifier.identifier}>{identifier.identifier}</option>
					{/each}
				</select>
			{:else}
				<input
					type="email"
					id="identifier_input"
					name="identifier"
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="name@mycommunity.com"
					bind:value={$claimEmail}
					required
				/>
			{/if}
			<input type="hidden" name="identifierType" value="email" />
		</div>

		<div class="mb-6">
			<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
				{m.firm_clear_fox_narrdesc()}
			</p>
			<label for="narrative" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.patchy_crazy_marten_march()}</label
			>
			<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
				{#if achievement.criteriaNarrative}
					<MarkdownRender value={achievement.criteriaNarrative} />
				{:else}
					{m.bright_swift_eagle_narrinst()}
				{/if}
			</p>
			<MarkdownEditor bind:value={$claimNarrative} inputName="narrative" />
		</div>
		<div class="mb-6">
			<label
				for="evidenceUrl"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.calm_steady_lynx_evidence()}</label
			>
			<input
				type="text"
				id="evidenceUrl"
				name="evidenceUrl"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				placeholder="I completed a project.."
				bind:value={$claimUrl}
			/>
		</div>
	{:else if claimIntent == 'REJECTED'}
		<h3 class="mb-2 mt-8 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
			{m.antsy_fresh_mantis_fry()}
		</h3>
		<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
			{m.cuddly_upper_deer_support()}
		</p>
	{/if}
	<div class="flex gap-1">
		<Button
			submodule="primary"
			buttonType="submit"
			text={m.bold_swift_eagle_submit()}
			id="claimFormSubmitButton"
		/>
		<Button
			submodule="secondary"
			buttonType="button"
			text={m.calm_steady_lynx_cancel()}
			on:click={handleCancel}
		/>
	</div>
</form>
