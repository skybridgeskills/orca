<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import RadioOption from '$lib/components/forms/RadioOption.svelte';
	import FormFieldLabel from '$lib/components/forms/FormFieldLabel.svelte';
	import Button from '$lib/components/Button.svelte';

	export let data: PageData;
	export let form: ActionData;

	const inputClass =
		'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500';

	const txAvailable = Boolean(
		data.transactionService?.url &&
		data.transactionService?.tenantName &&
		data.transactionService?.apiKeyConfigured
	);

	function initialIssuerValue(): string {
		if (data.issuer?.type === 'signingKey') return `signingKey:${data.issuer.signingKeyId}`;
		if (data.issuer?.type === 'transactionService' && txAvailable) return 'transactionService';
		return data.signingKeys[0] ? `signingKey:${data.signingKeys[0].id}` : '';
	}

	function truncateId(id: string, max = 8): string {
		if (id.length <= max) return id;
		return `${id.slice(0, max)}…`;
	}

	function truncateKeyDisplay(key: string, max = 16): string {
		if (key.length <= max) return key;
		return `${key.slice(0, max)}…`;
	}

	let selectedIssuer = initialIssuerValue();
	let revealApiKey = false;

	$: issuerType = selectedIssuer === 'transactionService' ? 'transactionService' : 'signingKey';
	$: issuerSigningKeyId = selectedIssuer.startsWith('signingKey:')
		? selectedIssuer.slice('signingKey:'.length)
		: '';

	function formatApiKeyDate(iso: string | null | undefined): string {
		if (iso == null || iso === '') return '(last updated unknown)';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '(last updated unknown)';
		return d.toISOString().slice(0, 10);
	}
</script>

<div class="max-w-2xl">
	<h1 class="text-xl sm:text-2xl mb-3 text-gray-800 dark:text-white">Issuer settings</h1>
	<p class="text-sm text-gray-600 dark:text-gray-400">
		Choose how your organization issues badges. Admins can switch between locally-signed credentials
		and the wallet-exchange flow.
	</p>

	<section class="mt-6">
		<h2 class="text-lg font-medium text-gray-800 dark:text-white">Issuer</h2>
		{#if data.missingActiveKey}
			<div
				class="border border-yellow-300 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200 p-3 rounded text-sm mb-3"
				role="status"
			>
				Your previously selected signing key ({truncateId(data.missingActiveKey.id)}) is no longer
				available. Please choose another issuer and save.
			</div>
		{/if}

		<form method="POST" action="?/setIssuer" use:enhance>
			<input type="hidden" name="type" value={issuerType} />
			<input type="hidden" name="signingKeyId" value={issuerSigningKeyId} />

			<div class="space-y-2 mt-3">
				{#each data.signingKeys as key (key.id)}
					<RadioOption
						value="signingKey:{key.id}"
						bind:selectedOption={selectedIssuer}
						name="issuerSelection"
						id="issuer-signing-{key.id}"
						label="Sign locally — Key {truncateKeyDisplay(key.publicKeyMultibase)}"
					/>
				{/each}
				<RadioOption
					value="transactionService"
					bind:selectedOption={selectedIssuer}
					name="issuerSelection"
					id="issuer-transaction-service"
					disabled={!txAvailable}
					label=""
				>
					Wallet exchange via Transaction Service
					{#if txAvailable}
						<span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">
							{data.transactionService?.url} · tenant &quot;{data.transactionService
								?.tenantName}&quot; · API key configured
						</span>
					{:else}
						<span class="block text-xs text-gray-400 mt-1"
							>Configure URL, tenant, and API key first</span
						>
					{/if}
				</RadioOption>
			</div>

			<div class="mt-4">
				<Button buttonType="submit" text="Save issuer" />
			</div>

			{#if form?.issuerError}
				<p class="mt-2 text-sm text-red-600 dark:text-red-500">{form.issuerError}</p>
			{/if}
		</form>
	</section>

	<hr class="my-6" />

	<section>
		<h2 class="text-lg font-medium text-gray-800 dark:text-white">Transaction service</h2>

		<form method="POST" action="?/setTransactionService" use:enhance class="mt-3">
			{#if data.transactionService?.apiKeyConfigured}
				<p class="text-sm text-gray-800 dark:text-gray-300">
					An API key is currently configured (last updated {formatApiKeyDate(
						data.transactionService.apiKeyUpdatedAt
					)}).
				</p>
			{:else}
				<p class="text-sm text-gray-800 dark:text-gray-300">No API key configured yet.</p>
			{/if}

			<div class="mt-4">
				<FormFieldLabel for="url" text="Transaction service URL" />
				<input
					id="url"
					name="url"
					type="url"
					required
					value={data.transactionService?.url ?? ''}
					class={inputClass}
				/>
			</div>

			<div class="mt-4">
				<FormFieldLabel for="tenantName" text="Tenant name" />
				<input
					id="tenantName"
					name="tenantName"
					type="text"
					required
					value={data.transactionService?.tenantName ?? ''}
					class={inputClass}
				/>
			</div>

			<div class="mt-4">
				<FormFieldLabel for="apiKey" text="API key" />
				<input
					id="apiKey"
					name="apiKey"
					type={revealApiKey ? 'text' : 'password'}
					autocomplete="off"
					placeholder="Leave blank to keep the current key"
					class={inputClass}
				/>
				<button
					type="button"
					class="text-xs text-gray-500 dark:text-gray-400 underline mt-1"
					on:click={() => (revealApiKey = !revealApiKey)}
				>
					{revealApiKey ? 'Hide what I just typed' : 'Reveal what I just typed'}
				</button>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
					Saving a value here replaces the existing key. The stored value is encrypted and never
					displayed.
				</p>
			</div>

			<div class="mt-4">
				<Button buttonType="submit" text="Save transaction service" />
			</div>

			{#if form?.transactionServiceError}
				<p class="mt-2 text-sm text-red-600 dark:text-red-500">{form.transactionServiceError}</p>
			{/if}
		</form>

		{#if data.transactionService?.apiKeyConfigured}
			<form method="POST" action="?/removeApiKey" use:enhance class="block mt-2">
				<button class="text-xs text-red-600 dark:text-red-400 underline" type="submit"
					>Remove API key</button
				>
			</form>
		{/if}
	</section>
</div>
