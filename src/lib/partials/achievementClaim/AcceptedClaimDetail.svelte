<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import type {
		Achievement,
		AchievementCategory,
		AchievementConfig,
		AchievementClaim,
		Organization
	} from '@prisma/client';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import Button from '$lib/components/Button.svelte';
	import ClaimForm from '$lib/partials/achievementClaim/ClaimForm.svelte';
	import DownloadButton from '$lib/components/DownloadButton.svelte';
	import AchievementClaimEvidence from '$lib/partials/achievementClaim/AchievementClaimEvidence.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import { linkedInShareUrl } from '$lib/utils/shareCredentials';
	import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
	import { onMount } from 'svelte';
	import { notifications, Notification } from '$lib/stores/notificationStore';

	export let achievement: Achievement & {
		organization: Organization;
		category: AchievementCategory | null;
		achievementConfig:
			| (AchievementConfig & {
					claimRequires: Achievement | null;
					reviewRequires: Achievement | null;
			  })
			| null;
	};
	export let existingBadgeClaim: AchievementClaim | null;

	let showClaimForm = false;
	let claimIntent: 'ACCEPTED' | 'REJECTED' | 'UNACCEPTED' =
		existingBadgeClaim?.claimStatus || 'ACCEPTED';

	let sendToWalletModalVisible = false;
	let showQRShareModal = false;

	onMount(async () => {
		await window.credentialHandlerPolyfill.loadOnce();
	});

	const sendToWallet = async () => {
		if (existingBadgeClaim?.claimStatus != 'ACCEPTED') return;
		if (!navigator.credentials) {
			notifications.addNotification(new Notification(m.chapi_noPolyfillError()));
			return;
		}

		const vc = await fetch(`/claims/${existingBadgeClaim.id}/download`, {
			method: 'POST',
			body: ''
		}).then(async (res) => await res.json());
		if (!vc) return;

		const presentation = {
			'@context': [
				'https://www.w3.org/2018/credentials/v1',
				'https://www.w3.org/2018/credentials/examples/v1'
			],
			type: 'VerifiablePresentation',
			verifiableCredential: [vc]
			//A proof is not required on the Verifiable Presentation (only on the VCs themselves)
		};
		const webCredential = new window.WebCredential(presentation.type, presentation);
		const chapiResult = await navigator.credentials.store(webCredential);
		if (!chapiResult) notifications.addNotification(new Notification(m.chapi_cancelFailError()));
	};
</script>

<h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">{m.backpack_yourBadge()}</h1>

<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
	{m.achievement_youHaveClaimed_description()}
</p>

<AchievementSummary {achievement} claim={existingBadgeClaim} />

<div class="max-w-2xl flex justify-between items-center mt-6 border-t pt-5">
	<h2 class="text-l sm:text-xl my-4 dark:text-white">{m.claim_statusUserAccepted()}</h2>
	<div>
		{#if !showClaimForm}
			<div class="flex gap-1">
				{#if existingBadgeClaim?.claimStatus === 'ACCEPTED'}
					<DownloadButton
						sourceUrl="/claims/{existingBadgeClaim?.id}/download"
						text={m.downloadCTA()}
						submodule="secondary"
						id="download-{existingBadgeClaim?.id}"
						fileName="{achievement.name.split(' ').join('-')}-credential.json"
					/>

					<Button
						text={m.claim_sendToWalletCTA()}
						onClick={() => {
							sendToWalletModalVisible = true;
						}}
						submodule="secondary"
					/>
				{/if}

				<Button
					text={m.claim_editCTA()}
					onClick={() => {
						claimIntent = 'ACCEPTED';
						showClaimForm = true;
					}}
					submodule="secondary"
				/>
				<Button
					submodule="danger"
					text={m.claim_rejectCTA()}
					onClick={() => {
						claimIntent = 'REJECTED';
						showClaimForm = true;
					}}
				/>
			</div>
		{/if}
	</div>
</div>

<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
	{m.claim_statusUserAccepted_description({
		createdOn: existingBadgeClaim?.createdOn?.toString() ?? ''
	})}
</p>

<AchievementClaimEvidence claim={existingBadgeClaim} />

{#if existingBadgeClaim?.claimStatus === 'ACCEPTED'}
	<div class="max-w-2xl flex justify-between items-center mt-6 border-t border-b pt-5">
		<h2 class="text-l sm:text-xl my-4 dark:text-white">{m.claim_shareCTA()}</h2>
		<div class="flex gap-1">
			<Button
				class="text-xs"
				submodule="secondary"
				text={m.share_copyUrl()}
				onClick={(e) => {
					if (!existingBadgeClaim || !achievement || !navigator.clipboard) {
						return;
					}
					const url = `${PUBLIC_HTTP_PROTOCOL}://${achievement.organization.domain}/ob2/a/${existingBadgeClaim.id}`;
					navigator.clipboard.writeText(url);
					console.log(m.claim_shareUrlCopied() + url);
					e.preventDefault();
					e.stopPropagation();
				}}
			/>
			<Button
				class="text-xs"
				submodule="secondary"
				text={m.qrCode()}
				onClick={() => {
					showQRShareModal = true;
				}}
			/>
			<a
				href={linkedInShareUrl({ ...existingBadgeClaim, achievement }).toString()}
				target={`linkedin-${achievement.id}`}
				rel="noopener noreferrer"
				class="flex items-center focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 focus-visible:outline-none"
				><img
					src="/linkedin-add-to-profile-button.png"
					alt={m.linkedin_addToProfileButton_label()}
				/></a
			>
		</div>
	</div>
{/if}

<Modal
	visible={showClaimForm}
	title={m.claim_editCTA()}
	on:close={() => {
		showClaimForm = false;
	}}
	actions={[]}
>
	<ClaimForm
		{achievement}
		achievementConfig={achievement.achievementConfig}
		{existingBadgeClaim}
		{claimIntent}
		handleCancel={() => {
			showClaimForm = false;
		}}
	/>
</Modal>

<Modal
	visible={sendToWalletModalVisible}
	title={m.claim_sendToWalletCTA()}
	on:close={() => {
		sendToWalletModalVisible = false;
	}}
	actions={[
		{
			label: m.claim_sendToWalletCTA(),
			onClick: () => {
				sendToWallet();
				sendToWalletModalVisible = false;
			},
			submodule: 'primary',
			buttonType: 'button'
		}
	]}
>
	<p class="text-center text-gray-500 dark:text-gray-400">
		{m.chapi_description()}
		<a href="https://chapi.io/" class="font-bold underline hover:no-underline" target="_blank"
			>Credential Handler API (CHAPI)</a
		>. {m.chapi_walletSignupCTA_description()}
		<a href="https://learncard.app" class="underline hover:no-underline font-bold" target="_blank"
			>LearnCard</a
		>.
	</p>
</Modal>

<Modal
	visible={showQRShareModal}
	title={m.share_qrCode_heading()}
	on:close={() => {
		showQRShareModal = false;
	}}
	actions={[]}
>
	<p class="text-sm text-gray-500 dark:text-gray-400">
		{m.share_qrCode_description()}
	</p>
	<QRCode
		url={`${PUBLIC_HTTP_PROTOCOL}://${achievement.organization.domain}/ob2/a/${existingBadgeClaim?.id}`}
		alt={m.share_qrCodeImageAltText()}
	/>
</Modal>
