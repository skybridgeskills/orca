<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import Card from '$lib/components/Card.svelte';
	import Ribbon from '$lib/illustrations/Ribbon.svelte';
	import StatusTag from '$lib/components/StatusTag.svelte';
	import type { Achievement, AchievementClaim } from '@prisma/client';
	import { imageUrl } from '$lib/utils/imageUrl';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		achievement: Achievement;
		linkAchievement?: boolean;
		achievementHref?: string;
		claim?: AchievementClaim | null;
		href?: string;
		imageSize?: '16' | '32'; // Tailwind width https://tailwindcss.com/docs/width
		isClickable?: boolean;
		disabled?: boolean;
		image?: import('svelte').Snippet;
		moredescription?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	}

	let {
		achievement,
		linkAchievement = true,
		achievementHref = '',
		claim = null,
		href = '',
		imageSize = '32',
		isClickable = false,
		disabled = false,
		image,
		moredescription,
		actions
	}: Props = $props();

	const dispatcher = createEventDispatcher();
</script>

<svelte:element
	this={!!href ? 'a' : 'section'}
	href={href || undefined}
	onclick={() => {
		if (isClickable) dispatcher('click');
	}}
	role={isClickable ? 'button' : 'listitem'}
	tabindex="-1"
	aria-roledescription={m.achievement_selectThisCTA()}
	class="relative max-w-2xl bg-white p-6 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex flex-col {isClickable
		? 'hover:shadow-lg hover:dark:shadow-gray-800 hover:border-gray-300 hover:dark:border-gray-500 cursor-pointer'
		: ''}"
>
	{#if claim?.claimStatus}
		<StatusTag
			absolute={true}
			status={claim.claimStatus}
			validFrom={claim.validFrom}
			validUntil={claim.validUntil}
		/>
	{/if}

	<div class="flex flex-col sm:flex-row gap-4">
		<!-- Image -->
		{#if image}{@render image()}{:else}
			{#if achievement.image}
				<img
					src={imageUrl(achievement.image)}
					class="object-scale-down"
					class:w-32={imageSize === '32'}
					class:w-16={imageSize === '16'}
					class:opacity-50={disabled}
					alt={m.achievementImageAltText({ name: achievement.name })}
				/>
			{:else}
				<div
					class={`text-gray-400 dark:text-gray-700`}
					class:w-32={imageSize === '32'}
					class:w-16={imageSize === '16'}
				>
					<Ribbon />
				</div>
			{/if}
		{/if}
		<div>
			<!-- Name -->

			<h3
				class={`max-w-2xl mb-4 text-xl font-extrabold tracking-tight leading-none lg:text-2xl xl:text-3xl ${
					disabled ? 'text-gray-700 dark:text-gray-400' : 'text-gray-900 dark:text-white'
				}`}
			>
				{#if achievementHref}
					<a href={achievementHref}>{achievement.name}</a>
				{:else if linkAchievement}
					<a href="/achievements/{achievement.id}">{achievement.name}</a>
				{:else}
					{achievement.name}
				{/if}
			</h3>

			<!-- Description -->
			{#if achievement.description}
				<p
					class={`max-w-2xl mb-4 lg:mb-8 font-light text-sm md:text-md ${
						disabled ? 'text-gray-700 dark:text-gray-400' : 'text-gray-900 dark:text-white'
					}`}
				>
					{achievement.description}
				</p>
			{/if}
			{@render moredescription?.()}
		</div>
	</div>
	<div class="absolute bottom-0 right-2">
		{@render actions?.()}
	</div>
</svelte:element>
