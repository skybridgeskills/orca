<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import QRCode from '$lib/components/QRCode.svelte';

	export let open = false;
	export let claimId: string;

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

	const dispatch = createEventDispatcher();
	let state: State = { kind: 'loading' };
	let abortController: AbortController | null = null;

	function close() {
		abortController?.abort();
		abortController = null;
		open = false;
		dispatch('close');
	}

	async function startExchange() {
		abortController?.abort();
		abortController = new AbortController();
		state = { kind: 'loading' };
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
				state = { kind: 'error', status: res.status, message };
				return;
			}
			const data = (await res.json()) as ExchangeResponse;
			const iu = data?.protocols?.iu;
			if (typeof iu !== 'string' || !iu) {
				state = { kind: 'error', status: 200, message: 'Missing interaction URL.' };
				return;
			}
			state = { kind: 'ready', data };
		} catch (err) {
			if ((err as Error)?.name === 'AbortError') return;
			state = { kind: 'error', status: 0, message: 'Network error.' };
		}
	}

	$: if (open) startExchange();
	$: if (!open) abortController?.abort();

	// TODO(polling): see Q10 — once the transaction service exposes exchange status,
	// poll while in `ready` to surface "credential delivered" or "expired" feedback.

	$: modalActions = buildActions(state);

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
	on:close={close}
>
	<div aria-live="polite" class="text-center text-sm text-gray-700 dark:text-gray-300">
		{#if state.kind === 'loading'}
			<p class="my-4">Preparing your wallet handoff…</p>
			<div
				class="mx-auto my-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
			></div>
		{:else if state.kind === 'ready'}
			<p class="my-4">
				Scan the QR with your wallet device, or click the button to open on this device. This link
				expires in about 10 minutes.
			</p>
			<div class="mx-auto my-4 inline-block">
				<QRCode url={state.data.protocols.iu} alt="Wallet handoff QR code" />
			</div>
			<p class="my-4">
				<a
					class="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					href={state.data.protocols.iu}
					target="_blank"
					rel="noopener noreferrer"
				>
					Open in your wallet
				</a>
			</p>
		{:else}
			<p class="my-4">{userMessage(state)}</p>
		{/if}
	</div>
</Modal>
