<script lang="ts">
	import { Icon } from 'svelte-icons-pack';
	import { BsQrCode } from 'svelte-icons-pack/bs';

	import { getChapi } from '$lib/chapi';
	import Modal from '$lib/components/Modal.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import { isTerminal, type ExchangeStatus } from '$lib/exchange/state';
	import * as m from '$lib/i18n/messages';
	import { notifications, Notification } from '$lib/stores/notificationStore';
	import { isMobileDevice } from '$lib/utils/device';

	import {
		buildProtocolOptions,
		type ExchangeProtocolMessageKey,
		type ExchangeProtocolValue
	} from './exchangeProtocolOptions';

	interface Props {
		open?: boolean;
		claimId: string;
		onclose?: () => void;
	}

	let { open = $bindable(false), claimId, onclose }: Props = $props();

	/** Slow on purpose: the wallet shows the result itself, so the UI need not be prompt. */
	const STATUS_CHECK_MS = 6000;

	type ExchangeProtocols = {
		iu: string;
		vcapi?: string;
		lcw?: string;
		verifiablePresentationRequest?: unknown;
	};
	type ExchangeResponse = { exchangeId: string; protocols: ExchangeProtocols; expiresAt: string };
	type State =
		| { kind: 'loading' }
		| { kind: 'ready'; data: ExchangeResponse }
		| { kind: 'error'; status: number };

	let exchangeState = $state<State>({ kind: 'loading' });
	let status = $state<ExchangeStatus | null>(null);
	let now = $state(Date.now());
	let sending = $state(false);
	let abortController: AbortController | null = null;
	let selectedProtocol: ExchangeProtocolValue = $state('iu');
	// On a phone the wallet app is on this device: lead with the same-device link and keep
	// the QR code (for handing off to another device) behind a button.
	let mobile = $state(false);
	let showQr = $state(true);

	let ready = $derived(exchangeState.kind === 'ready' ? exchangeState.data : null);
	let options = $derived(ready ? buildProtocolOptions(ready.protocols) : []);
	let activeOption = $derived(options.find((o) => o.value === selectedProtocol) ?? options[0]);
	let expiresAt = $derived(status?.expiresAt ?? ready?.expiresAt ?? null);
	let expired = $derived(
		!!expiresAt && Date.parse(expiresAt) <= now && status?.state !== 'complete'
	);
	let minutesLeft = $derived(
		expiresAt ? Math.max(1, Math.round((Date.parse(expiresAt) - now) / 60000)) : 0
	);
	let finished = $derived(!!status && (isTerminal(status.state) || expired));

	function protocolOptionLabel(key: ExchangeProtocolMessageKey): string {
		return (m as unknown as Record<string, () => string>)[key]();
	}

	function close() {
		abortController?.abort();
		abortController = null;
		open = false;
		onclose?.();
	}

	async function startExchange() {
		abortController?.abort();
		abortController = new AbortController();
		exchangeState = { kind: 'loading' };
		status = null;
		mobile = isMobileDevice();
		showQr = !mobile;
		try {
			const res = await fetch(`/claims/${claimId}/exchange`, {
				method: 'POST',
				signal: abortController.signal
			});
			if (!res.ok) {
				exchangeState = { kind: 'error', status: res.status };
				return;
			}
			const data = (await res.json()) as ExchangeResponse;
			if (typeof data?.protocols?.iu !== 'string' || !data.protocols.iu) {
				exchangeState = { kind: 'error', status: 200 };
				return;
			}
			now = Date.now();
			// An ORCA-hosted interaction URL opened on the same device just leads back to the
			// claim page, so on a phone prefer the LCW deep link when there is one.
			selectedProtocol = mobile && data.protocols.lcw ? 'lcw' : 'iu';
			status = { state: 'pending', expiresAt: data.expiresAt };
			exchangeState = { kind: 'ready', data };
		} catch (err) {
			if ((err as Error)?.name === 'AbortError') return;
			exchangeState = { kind: 'error', status: 0 };
		}
	}

	async function checkStatus() {
		if (!ready) return;
		now = Date.now();
		try {
			const res = await fetch(`/claims/${claimId}/exchange/${ready.exchangeId}`, {
				signal: abortController?.signal
			});
			// A failed check is not a failed exchange; the next tick tries again.
			if (res.ok) status = (await res.json()) as ExchangeStatus;
		} catch {
			/* retried on the next tick */
		}
	}

	async function sendToWebWallet() {
		const vcapi = ready?.protocols.vcapi;
		if (!vcapi || sending) return;
		sending = true;
		try {
			let chapi: Awaited<ReturnType<typeof getChapi>>;
			try {
				chapi = await getChapi();
			} catch {
				notifications.add(new Notification(m.happy_antsy_kite_succeed()));
				return;
			}
			// No credential is embedded: the wallet runs the exchange at `vcapi` with DID
			// authentication and receives a credential bound to its own DID. LearnCard reads
			// `data.interact` first, then `options.protocols.vcapi`.
			const data = {
				'@context': ['https://www.w3.org/ns/credentials/v2'],
				type: ['VerifiablePresentation'],
				interact: {
					service: [{ type: 'VerifiableCredentialApiExchangeService', serviceEndpoint: vcapi }]
				}
			};
			const result = await chapi.credentials.store(
				new chapi.WebCredential('VerifiablePresentation', data, {
					protocols: { vcapi },
					recommendedHandlerOrigins: ['https://learncard.app']
				})
			);
			await checkStatus();
			if (result === null && status?.state !== 'complete') {
				notifications.add(new Notification(m.tired_fancy_deer_lead()));
			}
		} finally {
			sending = false;
		}
	}

	// Side-effect: drive the external wallet-exchange network request off the modal's
	// open/closed state — initiate the exchange (async fetch) when opened, abort the
	// in-flight request when closed. This is a genuine external side-effect reacting
	// to the `open` prop, not state mirroring.
	$effect(() => {
		if (open) {
			startExchange();
		} else {
			abortController?.abort();
		}
	});

	// Side-effect: check the exchange status every 6 s while the modal is open and the
	// exchange can still change; paused while the tab is hidden.
	$effect(() => {
		if (!open || !ready || finished) return;
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') checkStatus();
			else now = Date.now();
		}, STATUS_CHECK_MS);
		return () => clearInterval(timer);
	});

	let modalActions = $derived(buildActions(exchangeState, status, expired));

	function buildActions(s: State, st: ExchangeStatus | null, isExpired: boolean) {
		const closeAction = {
			label: m.watery_serious_myna_pet(),
			buttonType: 'button' as const,
			submodule: 'secondary' as App.ButtonRole,
			onClick: close
		};
		const startOver = (label: string) => ({
			label,
			buttonType: 'button' as const,
			submodule: 'primary' as App.ButtonRole,
			onClick: startExchange
		});
		if (s.kind === 'error' && s.status !== 409 && s.status !== 503) {
			return [startOver(m.bold_warm_marten_tickle()), closeAction];
		}
		if (st?.state === 'complete') {
			return [
				{
					...closeAction,
					label: m.grand_gray_hound_clasp(),
					submodule: 'primary' as App.ButtonRole
				}
			];
		}
		if (st?.state === 'invalid' || isExpired) {
			return [startOver(m.proof_crazy_meerkat_cook()), closeAction];
		}
		return [closeAction];
	}

	function errorMessage(httpStatus: number): string {
		if (httpStatus === 502) return m.mad_vivid_cheetah_soar();
		if (httpStatus === 409 || httpStatus === 503) return m.sweet_weird_goat_propel();
		return m.light_dark_parrot_climb();
	}

	const AUTH_ERROR_CODES = new Set([
		'invalid_request',
		'missing_proof',
		'invalid_signature',
		'challenge_mismatch',
		'domain_mismatch',
		'invalid_proof_purpose',
		'unsupported_did_method',
		'holder_mismatch'
	]);

	function invalidMessage(st: ExchangeStatus): string {
		const code = st.errors?.[0]?.code;
		if (code && AUTH_ERROR_CODES.has(code)) return m.each_serious_dog_succeed();
		if (code === 'issuance_failed') return m.house_dry_falcon_ask();
		if (code === 'claim_unavailable') return m.plane_red_cow_propel();
		return m.stout_frail_fish_endorse();
	}
</script>

<Modal
	visible={open}
	id="send-to-wallet-exchange-modal"
	title={m.red_sleek_kite_relish()}
	actions={modalActions}
	onclose={close}
>
	<div aria-live="polite" class="text-center text-sm text-gray-700 dark:text-gray-300">
		{#if exchangeState.kind === 'loading'}
			<p class="my-4">{m.elegant_last_mule_succeed()}</p>
			<div
				class="mx-auto my-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
			></div>
		{:else if exchangeState.kind === 'error'}
			<p class="my-4">{errorMessage(exchangeState.status)}</p>
		{:else if status?.state === 'complete'}
			<p class="my-6 font-medium text-green-700 dark:text-green-400">{m.deft_small_boar_soar()}</p>
		{:else if status?.state === 'invalid'}
			<p class="my-6 text-red-700 dark:text-red-400">{invalidMessage(status)}</p>
		{:else if expired}
			<p class="my-6">{m.tiny_early_pug_cherish()}</p>
		{:else if ready}
			{#if status?.state === 'active'}
				<p class="my-4 font-medium">{m.frail_red_scallop_endorse()}</p>
			{/if}
			{#if ready.protocols.vcapi}
				<div class="my-4">
					<button
						type="button"
						class="w-full rounded-sm bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
						disabled={sending}
						onclick={sendToWebWallet}
					>
						{m.swift_next_deer_scribe()}
					</button>
					<p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
						{m.deft_bad_mouse_scold()}
						<a
							href="https://chapi.io/"
							class="font-bold underline hover:no-underline"
							target="_blank"
							rel="external noopener noreferrer">Credential Handler API (CHAPI)</a
						>. {m.wide_smooth_mantis_intend()}
						<a
							href="https://learncard.app"
							class="font-bold underline hover:no-underline"
							target="_blank"
							rel="external noopener noreferrer">LearnCard</a
						>.
					</p>
				</div>
				<hr class="my-4 border-gray-200 dark:border-gray-700" />
			{/if}
			<p class="my-4">
				{mobile
					? m.great_sea_turtle_spin({ minutes: minutesLeft })
					: m.deft_tired_oryx_change({ minutes: minutesLeft })}
			</p>
			<div class="my-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
				{#if options.length > 1}
					<div class="w-full space-y-2 text-left sm:w-auto sm:min-w-56">
						<label for="protocol-select" class="block text-sm text-gray-700 dark:text-gray-300">
							{m.cool_clear_lynx_choose()}
						</label>
						<select
							id="protocol-select"
							bind:value={selectedProtocol}
							class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
						>
							{#each options as o (o.value)}
								<option value={o.value}>{protocolOptionLabel(o.messageKey)}</option>
							{/each}
						</select>
					</div>
				{/if}
				{#if showQr}
					<div class="shrink-0">
						<QRCode url={activeOption.url} alt={m.flat_great_guppy_deny()} />
					</div>
				{/if}
			</div>
			<div class="my-4 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
				<a
					class="inline-flex items-center justify-center rounded-sm border border-blue-600 px-4 py-2 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-700"
					href={activeOption.url}
					target="_blank"
					rel="external noopener noreferrer"
				>
					{m.deft_bad_termite_startle()}
				</a>
				{#if mobile}
					<button
						type="button"
						class="inline-flex items-center justify-center gap-2 rounded-sm border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
						aria-expanded={showQr}
						onclick={() => (showQr = !showQr)}
					>
						<Icon src={BsQrCode} size="16" />
						{showQr ? m.happy_watery_myna_deny() : m.kind_watery_robin_shrine()}
					</button>
				{/if}
			</div>
		{/if}
	</div>
</Modal>
