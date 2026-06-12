<script lang="ts">
	import type { AchievementClaim, Organization } from '@prisma/client';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	import {
		claimActions,
		type ClaimActionDescriptor,
		type ClaimActionId,
		type ViewerRole
	} from '$lib/claimViewModel';
	import AchievementSummary from '$lib/components/achievement/AchievementSummary.svelte';
	import ActionHeading from '$lib/components/ActionHeading.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import EvidenceItem from '$lib/components/EvidenceItem.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import * as m from '$lib/i18n/messages';
	import AchievementCriteria from '$lib/partials/achievement/AchievementCriteria.svelte';
	import { notifications, Notification } from '$lib/stores/notificationStore';
	import { evidenceItem } from '$lib/utils/evidenceItem';
	import { linkedInShareUrl } from '$lib/utils/shareCredentials';

	import AchievementClaimEvidence from './AchievementClaimEvidence.svelte';
	import ClaimActionBar from './ClaimActionBar.svelte';
	import ClaimForm from './ClaimForm.svelte';
	import ClaimHeader from './ClaimHeader.svelte';
	import SendToWalletExchangeModal from './SendToWalletExchangeModal.svelte';
	import ShareActions from './ShareActions.svelte';

	import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

	/**
	 * Single prop contract shared by BOTH the authenticated `/claims/[id]` route
	 * and the public `/claims/[id]/public` route. The achievement carries its
	 * `organization` (+ optional `category` and flattened claim/review fields); the viewer's
	 * role is resolved once, server-side, via P1's `viewerRole` and passed in as
	 * `viewer` (the public route passes the literal `'public'`).
	 */
	interface Props {
		claim: AchievementClaim & {
			user?: { givenName: string | null; familyName: string | null } | null;
		};
		achievement: App.AchievementWithRelations & {
			organization: Organization;
		};
		viewer: ViewerRole;
		exchangeEnabled?: boolean;
		/**
		 * P4 seam: forwarded to `ClaimHeader`. P4 mounts the owner `VisibilityControl`
		 * and the authorized-viewer "why visible" indicator here without altering this
		 * component's layout or prop contract.
		 */
		visibility?: Snippet;
	}

	let { claim, achievement, viewer, exchangeEnabled = false, visibility }: Props = $props();

	const isOwner = $derived(viewer === 'owner');
	const isPublic = $derived(viewer === 'public');

	// --- Form / modal trigger state (lives here; opened by action handlers) ---
	let showClaimForm = $state(false);
	// Seeding the initial intent from the claim's current status is intentional;
	// the value is owned by the form thereafter (matches the prior partials).
	// svelte-ignore state_referenced_locally
	let claimIntent: 'ACCEPTED' | 'REJECTED' | 'UNACCEPTED' = $state(claim.claimStatus || 'ACCEPTED');
	let sendToWalletModalVisible = $state(false);
	let showQRShareModal = $state(false);
	let exchangeModalOpen = $state(false);

	onMount(async () => {
		// Owner-only: the credential-handler polyfill is only needed for the
		// send-to-wallet affordance, which only the owner of an accepted claim sees.
		if (isOwner) await window.credentialHandlerPolyfill.loadOnce();
	});

	const ob2Url = $derived(
		`${PUBLIC_HTTP_PROTOCOL}://${achievement.organization.domain}/ob2/a/${claim.id}`
	);

	const openForm = (intent: 'ACCEPTED' | 'REJECTED') => {
		claimIntent = intent;
		showClaimForm = true;
	};

	const sendToWallet = async () => {
		if (claim.claimStatus != 'ACCEPTED') return;
		if (!navigator.credentials) {
			notifications.add(new Notification(m.happy_antsy_kite_succeed()));
			return;
		}

		const vc = await fetch(`/claims/${claim.id}/download`, { method: 'POST', body: '' }).then(
			async (res) => await res.json()
		);
		if (!vc) return;

		const presentation = {
			'@context': [
				'https://www.w3.org/2018/credentials/v1',
				'https://www.w3.org/2018/credentials/examples/v1'
			],
			type: 'VerifiablePresentation',
			verifiableCredential: [vc]
			// A proof is not required on the Verifiable Presentation (only on the VCs themselves)
		};
		const webCredential = new window.WebCredential(presentation.type, presentation);
		const chapiResult = await navigator.credentials.store(webCredential);
		if (chapiResult === null) notifications.add(new Notification(m.tired_fancy_deer_lead()));
	};

	const copyLink = (e: MouseEvent | KeyboardEvent) => {
		if (!navigator.clipboard) return;
		navigator.clipboard.writeText(ob2Url);
		console.log(m.dense_cool_owl_nurture() + ob2Url);
		e.preventDefault();
		e.stopPropagation();
	};

	// --- Actions-as-data: map each derived ClaimActionId to a render descriptor ---
	const actionView = $derived(claimActions(claim.claimStatus, viewer, exchangeEnabled));

	const describe = (id: ClaimActionId): ClaimActionDescriptor => {
		switch (id) {
			case 'editClaim':
				return {
					id,
					// UNACCEPTED → "Accept"; ACCEPTED → "Edit claim"; REJECTED → "Change acceptance".
					label:
						claim.claimStatus === 'UNACCEPTED'
							? m.proof_funny_dog_pat()
							: claim.claimStatus === 'REJECTED'
								? m.mellow_brisk_otter_amend()
								: m.swift_lower_mantis_delight(),
					submodule: 'primary',
					onclick: () => openForm('ACCEPTED')
				};
			case 'rejectClaim':
				return {
					id,
					// UNACCEPTED → "Reject"; ACCEPTED → "Reject".
					label:
						claim.claimStatus === 'UNACCEPTED'
							? m.known_such_scallop_gaze()
							: m.stout_weary_deer_link(),
					submodule: 'danger',
					onclick: () => openForm('REJECTED')
				};
			case 'download':
				return {
					id,
					label: m.swift_steady_falcon_download(),
					submodule: 'secondary',
					downloadUrl: `/claims/${claim.id}/download`,
					downloadFileName: `${achievement.name.split(' ').join('-')}-credential.json`,
					controlId: `download-${claim.id}`
				};
			case 'sendToWallet':
				return {
					id,
					label: m.red_sleek_kite_relish(),
					submodule: 'secondary',
					onclick: () => {
						sendToWalletModalVisible = true;
					}
				};
			case 'exchange':
				return {
					id,
					label: m.red_sleek_kite_relish(),
					submodule: 'primary',
					disabled: exchangeModalOpen,
					onclick: () => {
						exchangeModalOpen = true;
					}
				};
			case 'copyLink':
				return {
					id,
					label: m.lucky_tired_mole_ask(),
					submodule: 'secondary',
					onclick: copyLink
				};
			case 'shareQr':
				return {
					id,
					label: m.sharp_quiet_panther_qr(),
					submodule: 'secondary',
					onclick: () => {
						showQRShareModal = true;
					}
				};
			case 'shareLinkedin':
				return {
					id,
					label: m.every_watery_kite_view(),
					submodule: 'secondary',
					href: linkedInShareUrl({ ...claim, achievement }).toString(),
					moreProps: { target: `linkedin-${achievement.id}` }
				};
		}
	};

	const manageActions = $derived(actionView.manage.map(describe));
	const shareActions = $derived(actionView.share.map(describe));

	// Heading copy for the owner "manage" row, by status.
	const manageHeading = $derived.by(() => {
		switch (claim.claimStatus) {
			case 'ACCEPTED':
				return m.merry_true_termite_cook();
			case 'UNACCEPTED':
				return m.early_deft_pug_cherish();
			case 'REJECTED':
				return m.petty_plane_marten_view();
			default:
				return '';
		}
	});

	// Owner created-date / status copy, by status.
	const ownerStatusCopy = $derived.by(() => {
		switch (claim.claimStatus) {
			case 'ACCEPTED':
				return m.sunny_bright_goat_view({ createdOn: claim.createdOn?.toString() ?? '' });
			case 'UNACCEPTED':
				return m.grand_steady_panther_relish({ createdOn: claim.createdOn?.toString() ?? '' });
			case 'REJECTED':
				return m.wet_dark_mole_fry();
			default:
				return '';
		}
	});

	// The owner form renders inline (replacing the action row) for UNACCEPTED /
	// REJECTED, but inside a Modal for ACCEPTED — preserving the pre-refactor UX.
	const formInModal = $derived(claim.claimStatus === 'ACCEPTED');

	// Non-owner (admin/community) status alert: level + translated status label.
	// Preserved verbatim from the pre-refactor route's `{#if !owner}` block.
	const levelByStatus: Record<string, App.NotificationLevel> = {
		UNACCEPTED: 'warning',
		REJECTED: 'warning',
		ACCEPTED: 'info'
	};
	const translatedStatus = $derived.by(() => {
		switch (claim.claimStatus) {
			case 'ACCEPTED':
				return m.bright_swift_eagle_soar();
			case 'REJECTED':
				return m.sharp_clear_fox_deny();
			case 'UNACCEPTED':
				return m.calm_steady_lynx_pause();
			default:
				return claim.claimStatus;
		}
	});
</script>

{#if isPublic}
	<!-- Public surface (ACCEPTED + PUBLIC only): preserves PublicClaimDetail. -->
	<Heading level="h1" title={`${m.fresh_bright_sparrow_earned()}: ${achievement.name}`} />

	<AchievementSummary {achievement} {claim} />

	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{claim.claimStatus === 'ACCEPTED' ? m.factual_best_dolphin_nurture() : ''}
		{claim.claimStatus === 'UNACCEPTED' ? m.cool_curly_panther_tickle() : ''}
	</p>

	<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">
		{claim.validFrom
			? `${m.cuddly_fluffy_kite_drip()}: ${claim.validFrom}.`
			: m.calm_quick_robin_drip()}
		{claim.validUntil ? `${m.tidy_fresh_seahorse_march()} ${claim.validUntil}.` : ''}
	</p>
	<div class="my-2 max-w-2xl">
		<AchievementCriteria {achievement} />
	</div>

	<AchievementClaimEvidence {claim} />
{:else}
	<ClaimHeader {claim} {viewer} {visibility} />

	{#if isOwner && claim.claimStatus === 'REJECTED'}
		<Alert level="warning" message={m.piquant_curly_mantis_tickle()} />
	{/if}

	<!-- StatusTag (claim) shown only for the owner's ACCEPTED view, as before. -->
	<AchievementSummary
		{achievement}
		claim={isOwner && claim.claimStatus === 'ACCEPTED' ? claim : null}
	/>

	{#if isOwner}
		<!-- Owner manage row: heading + accept/reject/edit (+ accepted download). -->
		{#if !showClaimForm || formInModal}
			<div class="max-w-2xl flex justify-between items-center mt-6 border-t pt-5">
				<h2 class="text-l sm:text-xl my-4 dark:text-white">{manageHeading}</h2>
				<ClaimActionBar actions={manageActions} />
			</div>

			{#if ownerStatusCopy}
				<p class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400">{ownerStatusCopy}</p>
			{/if}
		{:else}
			<h2 class="text-l sm:text-xl mt-8 mb-4 dark:text-white">{m.warm_stout_crossbill_ascend()}</h2>
		{/if}

		{#if claim.claimStatus === 'ACCEPTED'}
			<AchievementClaimEvidence {claim} />
			<ShareActions actions={shareActions} />
		{/if}

		{#if showClaimForm && !formInModal}
			<ClaimForm
				{achievement}
				existingBadgeClaim={claim}
				{claimIntent}
				handleCancel={() => {
					showClaimForm = false;
				}}
			/>
		{/if}
	{:else}
		<!-- Non-owner (admin / community): claimant attribution, evidence, status. -->
		<div class="max-w-2xl my-6">
			<ActionHeading
				text={m.swift_bold_eagle_announce({
					givenName: claim.user?.givenName ?? '',
					familyName: claim.user?.familyName ?? ''
				})}
			>
				{#snippet actions()}
					<span class="max-w-2xl my-4 text-sm text-gray-500 dark:text-gray-400"
						>{claim.createdOn.toDateString()}</span
					>
				{/snippet}
			</ActionHeading>

			<EvidenceItem item={evidenceItem(claim)} />

			<Alert level={levelByStatus[claim.claimStatus]}>
				<p class="max-w-2xl text-sm">
					<span class="font-bold">{m.kind_aqua_myna_jump()}</span>
					{translatedStatus}
				</p>
				{#if claim.validFrom}
					<p class="max-w-2xl mt-3 text-sm">
						<span>{m.cuddly_fluffy_kite_drip()}:</span>
						{claim.validFrom}
					</p>
				{/if}
				{#if claim.validUntil}
					<p class="max-w-2xl mt-3 text-sm">
						<span>{m.tidy_fresh_seahorse_march()}:</span>
						{claim.validUntil}
					</p>
				{/if}
			</Alert>
		</div>
	{/if}
{/if}

<!-- Owner ACCEPTED form modal + share modals (no-op for other viewers). -->
{#if isOwner}
	{#if formInModal}
		<Modal
			visible={showClaimForm}
			title={m.swift_lower_mantis_delight()}
			onclose={() => {
				showClaimForm = false;
			}}
			actions={[]}
		>
			<ClaimForm
				{achievement}
				existingBadgeClaim={claim}
				{claimIntent}
				handleCancel={() => {
					showClaimForm = false;
				}}
			/>
		</Modal>
	{/if}

	{#if claim.claimStatus === 'ACCEPTED' && !exchangeEnabled}
		<Modal
			visible={sendToWalletModalVisible}
			title={m.red_sleek_kite_relish()}
			onclose={() => {
				sendToWalletModalVisible = false;
			}}
			actions={[
				{
					label: m.red_sleek_kite_relish(),
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
				{m.deft_bad_mouse_scold()}
				<a href="https://chapi.io/" class="font-bold underline hover:no-underline" target="_blank"
					>Credential Handler API (CHAPI)</a
				>. {m.wide_smooth_mantis_intend()}
				<a
					href="https://learncard.app"
					class="underline hover:no-underline font-bold"
					target="_blank">LearnCard</a
				>.
			</p>
		</Modal>

		<Modal
			visible={showQRShareModal}
			title={m.happy_bright_mole_spill()}
			onclose={() => {
				showQRShareModal = false;
			}}
			actions={[]}
		>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{m.mad_merry_kite_support()}
			</p>
			<QRCode url={ob2Url} alt={m.plane_light_fish_view()} />
		</Modal>
	{/if}

	{#if claim.claimStatus === 'ACCEPTED' && exchangeEnabled}
		<SendToWalletExchangeModal
			bind:open={exchangeModalOpen}
			claimId={claim.id}
			onclose={() => {
				exchangeModalOpen = false;
			}}
		/>
	{/if}
{/if}
