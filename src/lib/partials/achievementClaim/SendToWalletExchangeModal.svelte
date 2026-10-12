<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import * as m from '$lib/i18n/messages';

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
		| { kind: 'error'; status: number; message: string };

	let exchangeState = $state<State>({ kind: 'loading' });
	let abortController: AbortController | null = null;
	let selectedProtocol: ExchangeProtocolValue = $state('iu');
	let options = $derived(
		exchangeState.kind === 'ready' ? buildProtocolOptions(exchangeState.data.protocols) : []
	);
	let activeOption = $derived(options.find((o) => o.value === selectedProtocol) ?? options[0]);

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
		selectedProtocol = 'iu';
		try {
			const res = await fetch(`/claims/${claimId}/exchange`, {
				method: 'POST',
				signal: abortController.signal
			});
			if (!res.ok) {
				let message = 'Something went wrong.';
				try {
					const body = await res.json();
					if (body?.message && typeof body.message === 'string') message = body.message;
				} catch {
					/* swallow */
				}
				exchangeState = { kind: 'error', status: res.status, message };
				return;
			}
			const data = (await res.json()) as ExchangeResponse;
			const iu = data?.protocols?.iu;
			if (typeof iu !== 'string' || !iu) {
				exchangeState = { kind: 'error', status: 200, message: 'Missing interaction URL.' };
				return;
			}
			exchangeState = { kind: 'ready', data };
		} catch (err) {
			if ((err as Error)?.name === 'AbortError') return;
			exchangeState = { kind: 'error', status: 0, message: 'Network error.' };
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

	// TODO(polling): see Q10 — once the transaction service exposes exchange status,
	// poll while in `ready` to surface "credential delivered" or "expired" feedback.

	let modalActions = $derived(buildActions(exchangeState));

	function buildActions(s: State) {
		const closeAction = {
			label: 'Close',
			buttonType: 'button' as const,
			submodule: 'secondary' as App.ButtonRole,
			onClick: close
		};
		if (s.kind === 'error' && s.status !== 409 && s.status !== 503) {
			return [
				{
					label: 'Try again',
					buttonType: 'button' as const,
					submodule: 'primary' as App.ButtonRole,
					onClick: startExchange
				},
				closeAction
			];
		}
		return [closeAction];
	}

	function userMessage(s: { kind: 'error'; status: number; message: string }): string {
		if (s.status === 502) return "We couldn't reach the issuer service. Please try again.";
		if (s.status === 409 || s.status === 503)
			return 'Issuer is misconfigured. Contact your administrator.';
		return "We couldn't start the wallet handoff. Please try again.";
	}
</script>

<Modal
	visible={open}
	id="send-to-wallet-exchange-modal"
	title="Send to wallet"
	actions={modalActions}
	onclose={close}
>
	<div aria-live="polite" class="text-center text-sm text-gray-700 dark:text-gray-300">
		{#if exchangeState.kind === 'loading'}
			<p class="my-4">Preparing your wallet handoff…</p>
			<div
				class="mx-auto my-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
			></div>
		{:else if exchangeState.kind === 'ready'}
			<p class="my-4">
				Scan the QR with your wallet device, or click the button to open on this device. This link
				expires in about 10 minutes.
			</p>
			<div
				class="my-6 flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-center sm:gap-8"
			>
				{#if options.length > 1}
					<div class="text-left space-y-2 w-full sm:w-auto sm:min-w-56">
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
				<div class="shrink-0">
					<QRCode url={activeOption.url} alt="Wallet handoff QR code" />
				</div>
			</div>
			<p class="my-4">
				<a
					class="inline-block rounded-sm bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					href={activeOption.url}
					target="_blank"
					rel="external noopener noreferrer"
				>
					Open in your wallet
				</a>
			</p>
		{:else}
			<p class="my-4">{userMessage(exchangeState)}</p>
		{/if}
	</div>
</Modal>
