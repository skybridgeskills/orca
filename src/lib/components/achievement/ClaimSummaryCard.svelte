<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime.js';
	import Icon from 'svelte-icons-pack/Icon.svelte';
	import FaShareSquare from 'svelte-icons-pack/fa/FaShareSquare.js';
	import FaSolidInfoCircle from 'svelte-icons-pack/fa/FaSolidInfoCircle.js';
	import BiSolidNoEntry from 'svelte-icons-pack/bi/BiSolidNoEntry.js';
	import AchievementSummary from './AchievementSummary.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import type { Achievement, AchievementClaim, ClaimStatus, Organization } from '@prisma/client';
	import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
	import { notifications, Notification } from '$lib/stores/notificationStore';
	import { linkedInShareUrl } from '$lib/utils/shareCredentials';
	import Ribbon from '$lib/illustrations/Ribbon.svelte';

	dayjs.extend(relativeTime);

	export let claim: AchievementClaim;
	export let achievement: Achievement;
	export let org: Organization;

	let showModal = false;

	const handleShare = () => {
		if (navigator.share) {
			navigator.share({
				title: achievement.name,
				text: `${m.piquant_dense_meerkat_link({ name: achievement.name })} 
				
				${achievement.description}`,
				url: `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ob2/a/${claim.id}`
			});
		} else {
			showModal = true;
			document.getElementById('share-modal')?.focus();
		}
	};
	const handleCopyToClipboard = () => {
		if (!claim || !navigator.clipboard) {
			notifications.add(new Notification(m.home_true_jackdaw_emerge()));
		}
		navigator.clipboard.writeText(`${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ob2/a/${claim.id}`);
	};
</script>

<AchievementSummary
	{claim}
	achievementHref={`/achievements/${achievement.id}/claim`}
	achievement={{
		...achievement,
		name: claim.claimStatus == 'ACCEPTED' ? m.weary_bold_myna_buy() : m.status_rejected(),
		description: ''
	}}
>
	<div slot="moredescription">
		{#if claim.claimStatus === 'ACCEPTED'}
			<p class="text-sm md:text-md font-light text-gray-500 dark:text-gray-400">
				{m.equal_active_parrot_march()}
				{dayjs(claim.createdOn).fromNow()}
			</p>
		{:else}
			<p class="text-sm md:text-md font-light text-gray-500 dark:text-gray-400">
				{m.piquant_curly_mantis_tickle()}
			</p>
		{/if}
	</div>

	<div slot="image">
		{#if claim.claimStatus == 'ACCEPTED'}
			<div class="text-green-700 dark:text-green-600 w-10">
				<Ribbon />
			</div>
		{:else if claim.claimStatus == 'REJECTED'}
			<div class="w-10 text-orange-700 dark:text-orange-600">
				<Icon src={BiSolidNoEntry} size="40" color="currentColor" />
			</div>
		{/if}
	</div>
	<div slot="actions">
		{#if claim.claimStatus === 'ACCEPTED' && claim.validFrom}
			<div class="p-2 flex flex-row space-x-3">
				<a
					class="icon text-gray-600 w-4 h-4 cursor-pointer"
					tabindex="0"
					href={`/claims/${claim.id}`}
				>
					<span class="sr-only">{m.happy_next_robin_clasp()}</span>
					<Icon src={FaSolidInfoCircle} size="20" color="currentColor" />
				</a>
				<button
					class="icon text-gray-600 w-4 h-4 cursor-pointer"
					tabindex="0"
					on:click={() => {
						handleShare();
					}}
					on:keypress={() => {
						handleShare();
					}}
				>
					<span class="sr-only">{m.happy_sparse_lemur_clasp()}</span>
					<Icon src={FaShareSquare} size="20" color="currentColor" />
				</button>
			</div>
		{/if}
	</div>
</AchievementSummary>

<Modal
	id="share-modal"
	title="Share your {achievement.name} badge"
	visible={showModal}
	on:close={() => {
		showModal = false;
	}}
	actions={[]}
>
	<p class="max-w-2xl mb-4 lg:mb-8 text-gray-500 text-sm md:text-md dark:text-gray-400">
		{m.quiet_quick_panther_emerge()}
	</p>
	<div class="flex mb-3 w-full">
		<span
			class="inline-flex items-center p-2 text-sm text-gray-900 bg-gray-50 rounded-l border border-r-0 border-gray-300"
			>{`${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ob2/a/${claim.id}`}</span
		>
		<button
			class="rounded-none rounded-r bg-gray-50 p-2 mr-3 border border-gray-300 text-gray-700 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm cursor-pointer"
			on:click={() => {
				handleCopyToClipboard();
			}}
			on:keypress={() => {
				handleCopyToClipboard();
			}}
		>
			{m.quick_clear_owl_copy()}
		</button>
	</div>

	<a
		href={linkedInShareUrl({
			...claim,
			achievement: { ...achievement, organization: org }
		}).toString()}
		target={`linkedin-${achievement.id}`}
		rel="noopener noreferrer"
		class="flex items-center focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 focus-visible:outline-none"
		><img
			src="/linkedin-add-to-profile-button.png"
			alt={m.every_watery_kite_view()}
		/></a
	>
</Modal>
