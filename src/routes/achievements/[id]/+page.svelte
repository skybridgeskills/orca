<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime.js';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Button from '$lib/components/Button.svelte';
	import Ribbon from '$lib/illustrations/Ribbon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import type { PageData } from './$types';
	import Icon from 'svelte-icons-pack/Icon.svelte';
	import FaSolidEnvelopeOpenText from 'svelte-icons-pack/fa/FaSolidEnvelopeOpenText.js';
	import FaSolidInfoCircle from 'svelte-icons-pack/fa/FaSolidInfoCircle.js';
	import FaTrashAlt from 'svelte-icons-pack/fa/FaTrashAlt.js';
	import AchievementCriteria from '$lib/partials/achievement/AchievementCriteria.svelte';
	import { imageUrl } from '$lib/utils/imageUrl';
	import { isAdmin } from '$lib/permissions/isAdmin';
	import ClaimSummaryCard from '$lib/components/achievement/ClaimSummaryCard.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import type {
		Achievement,
		AchievementCategory,
		AchievementClaim,
		ClaimEndorsement,
		User
	} from '@prisma/client';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import {
		acLoading,
		fetchAchievementCategories,
		getCategoryById
	} from '$lib/stores/achievementCategoryStore';
	import ClaimList from '$lib/components/achievement/ClaimList.svelte';
	import { onMount, setContext } from 'svelte';
	import { calculatePageAndSize } from '$lib/utils/pagination';
	import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
	import { ensureLoaded } from '$lib/stores/common';
	import {
		achievements,
		achievementsLoading,
		fetchAchievements
	} from '$lib/stores/achievementStore';
	import {
		backpackClaims,
		backpackClaimsLoading,
		fetchBackpackClaims
	} from '$lib/stores/backpackStore';

	dayjs.extend(relativeTime);

	export let data: PageData;
	let showDeleteModal = false;
	let showShareModal = false;

	const breadcrumbItems = [
		{ text: m.each_fluffy_fox_view(), href: '/' },
		{ text: m.antsy_grand_rabbit_gaze(), href: '/achievements' },
		{ text: data.achievement.name }
	];

	let config: App.AchievementConfig | null = null;
	let claim: AchievementClaim | undefined;
	let category: AchievementCategory | undefined;
	let userHoldsRequiredAchievement = false;
	let inviteCapability = false;
	let reviewRequires: Achievement | undefined;
	let invite: (ClaimEndorsement & { creator: User | null }) | undefined;
	$: {
		config = data.achievement.achievementConfig as App.AchievementConfig | null;
		claim = data.relatedClaims.find((c) => data.achievement.id == c.achievementId);
		userHoldsRequiredAchievement =
			data.relatedClaims.filter((c) => c.achievementId == config?.claimRequiresId).length > 0;
		inviteCapability =
			isAdmin({ user: data.session?.user || undefined }) ||
			(!!config?.json?.capabilities?.inviteRequires &&
				!!$backpackClaims.find(
					(c) =>
						c.achievementId == config?.json?.capabilities?.inviteRequires &&
						c.validFrom &&
						c.claimStatus == 'ACCEPTED'
				));

		reviewRequires = data.relatedAchievements
			.filter((c) => data.achievement.achievementConfig?.reviewRequiresId == c.id)
			.find(() => true);

		invite = data.outstandingInvites.find((a) => true);
	}

	setContext('achievementId', data.achievement.id);
	setContext('session', data.session);

	onMount(async () => {
		await ensureLoaded(achievementsLoading, fetchAchievements);
		await ensureLoaded(acLoading, fetchAchievementCategories);
		await ensureLoaded(backpackClaimsLoading, fetchBackpackClaims);
		category = getCategoryById(data.achievement.categoryId ?? 'Uncategorized');
	});
</script>

<Breadcrumbs items={breadcrumbItems} />

<div class="max-w-2xl flex justify-between items-center mb-4">
	<h1 class="inline-flex mt-1 mr-3 text-xl sm:text-2xl text-gray-800 dark:text-white">
		{data.achievement.name}
	</h1>
	<div class="inline-flex items-center">
		{#if inviteCapability}
			<Button
				href={`/achievements/${data.achievement.id}/award`}
				text={m.bright_happy_sparrow_award()}
			/>
		{/if}

		{#if data.editAchievementCapability}
			<Button
				href={`/achievements/${data.achievement.id}/edit`}
				submodule="secondary"
				text={m.sharp_clear_fox_edit()}
			/>
		{/if}
		{#if isAdmin({ user: data.session?.user || undefined })}
			<Button
				submodule="danger"
				on:click={() => {
					showDeleteModal = true;
				}}
			>
				<span class="sr-only">{m.firm_steady_boar_delete()}</span>
				<div class="h-4 w-4">
					<Icon src={FaTrashAlt} size="16" color="currentColor" />
				</div>
			</Button>
		{/if}
		<Button
			text={m.happy_sparse_lemur_clasp()}
			submodule="secondary"
			on:click={() => {
				showShareModal = true;
			}}
		/>
		{#if config?.claimable && (config.claimRequiresId == null || userHoldsRequiredAchievement)}
			<Button
				href={invite
					? `/achievements/${invite.achievementId}/claim?i=${invite.id}&e=${encodeURIComponent(
							invite.inviteeEmail
						)}`
					: `/achievements/${data.achievement.id}/claim`}
				text={m.bold_swift_eagle_claim()}
				submodule="primary"
			/>
		{/if}
	</div>
</div>

{#if category !== undefined}
	<span
		class="bg-gray-100 text-gray-800 text-md font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300"
		>{m.serious_gentle_boar_nurture()}: {category.name}</span
	>
{/if}

<div class="mb-4 max-w-xs dark:bg-gray-200 mt-4 p-2 rounded-md">
	{#if data.achievement.image}
		<img
			src={imageUrl(data.achievement.image)}
			alt={m.firm_steady_boar_imagealt({ name: data.achievement.name })}
		/>
	{:else}
		<div class="text-gray-400 dark:text-gray-700">
			<Ribbon />
		</div>
	{/if}
</div>

<p class="max-w-2xl mt-1 text-sm text-gray-500 dark:text-gray-400">
	{data.achievement.description}
</p>

<div class="mt-4 max-w-2xl">
	{#if claim && claim?.claimStatus !== 'UNACCEPTED'}
		<!-- C1: User has a claim for this achievement. It may be under review, accepted, rejected -->
		<ClaimSummaryCard {claim} achievement={data.achievement} org={data.org} />
	{:else if invite || claim?.claimStatus == 'UNACCEPTED'}
		<!-- C2: User does not have a claim, but has an invitation to claim (when a user existed at time of invite, this is represented by a claim with status unaccepted) -->
		<AchievementSummary
			achievement={{ ...data.achievement, name: m.frail_weary_rabbit_nurture(), description: '' }}
		>
			<div slot="moredescription">
				<p class="text-sm md:text-md font-light text-gray-500 dark:text-gray-400">
					{m.kind_dry_panther_bask()}
					{#if invite}
						{m.watery_fluffy_mole_pout({
							givenName: invite?.creator?.givenName ?? '',
							familyName: invite?.creator?.familyName ?? '',
							timeAgo: dayjs(invite.createdAt).fromNow()
						})}
					{/if}
				</p>
			</div>
			<div slot="image">
				<div class="text-blue-600 dark:text-blue-700 w-10">
					<Icon src={FaSolidEnvelopeOpenText} size="40" color="currentColor" />
				</div>
			</div>
			<div slot="actions">
				<div class="p-2 flex flex-row space-x-3">
					<a
						class="text-gray-600 w-4 h-4 cursor-pointer"
						href={invite
							? `/achievements/${data.achievement.id}/claim?i=${invite?.id}&e=${encodeURIComponent(
									invite?.inviteeEmail
								)}`
							: `/achievements/${data.achievement.id}/claim`}
					>
						<span class="sr-only">{m.bold_swift_eagle_claim()}</span>
						<Icon src={FaSolidInfoCircle} size="20" color="currentColor" />
					</a>
				</div>
			</div>
		</AchievementSummary>
	{/if}
</div>

<!-- Claim Rules -->
<div class="mt-4 max-w-2xl">
	<Heading title={m.warm_tangy_deer_heading()} level="h3">
		{#if !config?.claimable}
			<!-- A1: Achievement is not claimable -->
			{m.firm_clear_fox_disabled()}.
		{/if}

		{#if config?.claimable && config?.claimRequiresId}
			<!-- A2: Achievement is claimable, and requires a prerequisite -->
			{@const claimRequires = $achievements.find((a) => config?.claimRequiresId == a.id)}
			{#if claimRequires}
				{m.sharp_quiet_panther_requires()}
				<a href={`/achievements/${claimRequires.id}`} class="font-bold underline hover:no-underline"
					>{claimRequires.name}</a
				>. {#if userHoldsRequiredAchievement}
					{m.swift_steady_falcon_meets()}
				{:else}
					{m.sharp_clear_fox_notmeets()}
				{/if}
			{/if}
		{:else if config?.claimable && !config?.claimRequiresId}
			<!-- A3: Achievement is claimable by anybody, even members of the public -->
			<span class="text-gray-500 dark:text-gray-400">
				{m.sharp_fluffy_mantis_delight()}
			</span>
		{/if}

		{@const inviteRequires = config?.json?.capabilities?.inviteRequires
			? $achievements.find((a) => config?.json?.capabilities?.inviteRequires == a.id)
			: undefined}
		{#if inviteRequires}
			{m.bright_happy_sparrow_invitedesc()}
			<a href={`/achievements/${inviteRequires?.id}`} class="font-bold underline hover:no-underline"
				>{inviteRequires?.name}</a
			>.
		{:else if !config?.claimable}
			{m.calm_steady_lynx_adminonly()}
		{/if}

		{#if reviewRequires && !!config?.reviewsRequired}
			{m.warm_tangy_deer_reviewsum({
				reviewsRequired: config?.reviewsRequired ?? 0
			})}
			<a
				href={`/achievements/${reviewRequires?.id}`}
				class="font-bold underline hover:no-underline"
			>
				{reviewRequires.name}</a
			>.
		{:else if !config?.reviewRequiresId && config?.reviewsRequired}
			{m.calm_steady_lynx_adminreview()}
		{:else}
			{m.gentle_brave_falcon_noreviews()}
		{/if}
	</Heading>
</div>

{#if data.org.json?.permissions?.editAchievementCapability?.requiresAchievement == data.achievement.id}
	<div class="mt-4 max-w-2xl">
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{m.next_arable_mule_zoom()}
		</p>
	</div>
{/if}

<!-- Criteria -->
<div class="my-4 max-w-2xl">
	<AchievementCriteria achievement={data.achievement} />
</div>

<!-- Existing community claims -->
<Heading
	title={m.sad_antsy_crossbill_race()}
	level="h3"
	description={`${m.vivid_best_bat_soar({
		count: data.achievement._count.achievementClaims
	})} ${
		['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(data.session?.user?.orgRole || 'none')
			? m.bad_mad_jackdaw_tap()
			: m.great_merry_boar_ascend()
	}`}
/>

{#if data.session?.user}
	<div class="relative overflow-x-auto">
		<ClaimList
			{...calculatePageAndSize($page.url)}
			totalCount={data.achievement._count.achievementClaims}
			enableInvites={inviteCapability}
		/>
	</div>
{:else}
	<div class="mb-4 text-sm text-gray-500 dark:text-gray-400">
		{m.sunny_brave_lemur_feel()}
	</div>
{/if}

<form id="deleteForm" action="?/delete" method="POST" />

<Modal
	visible={showDeleteModal}
	title={m.stout_sad_bat_spur()}
	on:close={() => {
		showDeleteModal = false;
	}}
	actions={[
		{
			label: m.calm_steady_lynx_cancel(),
			buttonType: 'button',
			submodule: 'secondary',
			onClick: () => {
				showDeleteModal = false;
			}
		},
		{
			label: m.firm_steady_boar_delete(),
			buttonType: 'button',
			submodule: 'danger',
			onClick: () => {
				const deleteForm = document.getElementById('deleteForm');
				if (deleteForm instanceof HTMLFormElement) deleteForm.submit();
				showDeleteModal = false;
			}
		}
	]}
>
	<p class="text-sm text-gray-500 dark:text-gray-400 max-w-prose">
		{m.plane_fancy_goat_scribe({
			name: data.achievement.name,
			count: data.achievement._count.achievementClaims
		})}
	</p>
</Modal>

<Modal
	visible={showShareModal}
	title={m.happy_sparse_lemur_clasp()}
	on:close={() => {
		showShareModal = false;
	}}
	actions={[
		{
			label: m.lucky_tired_mole_ask(),
			buttonType: 'button',
			submodule: 'secondary',
			onClick: (e) => {
				if (!data.achievement || !navigator.clipboard) {
					return;
				}
				const url = `${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/achievements/${data.achievement.id}`;
				navigator.clipboard.writeText(url);
				console.log(m.dense_cool_owl_nurture() + url);
				e.preventDefault();
				e.stopPropagation();
			}
		}
	]}
>
	<p class="text-sm text-gray-500 dark:text-gray-400">
		{m.best_fresh_honeybadger_pet()}
	</p>
	<QRCode
		url={`${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/achievements/${data.achievement.id}`}
		alt={m.plane_light_fish_view()}
	/>
</Modal>
