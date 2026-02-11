<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import Alert from '$lib/components/Alert.svelte';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { PageData } from './$types';
	import ActionHeading from '$lib/components/ActionHeading.svelte';
	import EvidenceItem from '$lib/components/EvidenceItem.svelte';
	import { evidenceItem } from '$lib/utils/evidenceItem';
	import Button from '$lib/components/Button.svelte';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import MarkdownRender from '$lib/components/MarkdownRender.svelte';

	export let data: PageData;
	export let form;
	let endorsementJson: {
		narrative?: string;
		id?: string;
	} = JSON.parse(data.myEndorsements[0]?.json?.toString() || '{}');
	let endorsementNarrative = endorsementJson.narrative || '';
	let endorsementUrl = endorsementJson.id || '';

	$: {
		if (form) endorsementJson = JSON.parse(form?.endorsement?.json?.toString() || '{}');
		else if (data.myEndorsements.length) {
			endorsementJson = JSON.parse(data.myEndorsements[0].json?.toString() || '{}');
		}
	}

	const breadcrumbItems = [
		{ text: m.home(), href: '/' },
		{ text: data.achievement.name, href: `/achievements/${data.achievement.id}` },
		{
			text: `${data.claim.user.givenName} ${data.claim.user.familyName}`,
			href: `../${data.claim.id}`
		},
		{ text: m.warm_tangy_deer_endorseform() }
	];
</script>

<Breadcrumbs items={breadcrumbItems} />

{#if form}
	<!-- Result of form submission: a new Endorsement or a previous one-->
	<h3 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
		{m.warm_tangy_deer_awarded()}
	</h3>

	<AchievementSummary achievement={data.achievement} />

	{#if form.status?.created === false}
		<Alert message={m.sharp_clear_fox_alreadyrec()} level="warning" />
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
				<p>
					<span class="font-bold">{m.calm_steady_lynx_evidence()}:</span>
					<a href={endorsementJson.id} class="text-blue-700 text-underline hover:no-underline">
						{endorsementJson.id}
					</a>
				</p>
			{/if}
		</div>
	{/if}

	<a href="../{data.claim.id}"><Button text="Done" /></a>
{:else}
	<!-- Submission form -->
	<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">{m.warm_tangy_deer_endorseform()}</h1>
	<p class="mt-1 mb-8 text-sm text-gray-500 dark:text-gray-400">
		{m.calm_steady_lynx_endorsedesc({
			givenName: data.claim.user.givenName ?? '',
			familyName: data.claim.user.familyName ?? ''
		})}
	</p>

	<AchievementSummary achievement={data.claim.achievement} />

	<div class="max-w-2xl my-6">
		<ActionHeading
			text={`${data.claim.user.givenName} ${data.claim.user.familyName} claimed this badge`}
		>
			<span slot="actions">{data.claim.createdOn.toDateString()}</span>
		</ActionHeading>

		<EvidenceItem item={evidenceItem(data.claim)} />
	</div>

	<form method="POST" class="max-w-2xl mt-4">
		<div class="mb-6">
			<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
				{m.bright_happy_sparrow_narrdesc()}
			</p>
			<label for="narrative" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.achievement_narrative()}</label
			>
			<textarea id="narrative" name="narrative" class="hidden" bind:value={endorsementNarrative} />
			<MarkdownEditor inputName="narrative" bind:value={endorsementNarrative} />
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
				bind:value={endorsementUrl}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
				placeholder="https://portfolio.example.com/..."
			/>
		</div>

		<div class="inline-flex items-center">
			<Button buttonType="submit" text={m.bold_swift_eagle_submit()} />
			<a href="../{data.claim.id}"><Button submodule="secondary" text={m.calm_steady_lynx_cancel()} /></a>
		</div>
	</form>
{/if}
