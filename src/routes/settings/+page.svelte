<script lang="ts">
	import { startRegistration } from '@simplewebauthn/browser';

	import Button from '$lib/components/Button.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import * as m from '$lib/i18n/messages';

	import type { PageData } from './$types';

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let data: PageData;
	const noErrors: { [key: string]: string | null } = {
		givenName: null,
		familyName: null,
		identifierVisibility: null,
		defaultVisibility: null
	};
	let errors = { ...noErrors };
	// Passkeys are authenticators, never contact/identity: exclude PASSKEY rows from the
	// contact Identifiers table + the contact-visibility control. They appear only in the
	// Passkeys section below.
	function contactIdentifiersFrom(identifiers: App.UserData['identifiers'] | undefined) {
		return (identifiers ?? []).filter((i) => i.type !== 'PASSKEY');
	}
	$: contactIdentifiers = contactIdentifiersFrom(data.session?.user?.identifiers);
	let formData = {
		givenName: data.session?.user?.givenName ?? '',
		familyName: data.session?.user?.familyName ?? '',
		identifierVisibility:
			contactIdentifiersFrom(data.session?.user?.identifiers).find(() => true)?.visibility ??
			'COMMUNITY',
		defaultVisibility: data.session?.user?.defaultVisibility ?? 'COMMUNITY',
		profileVisibility: data.session?.user?.profileVisibility ?? 'COMMUNITY',
		emailNotifications: data.emailNotifications ?? true
	};

	let passkeyError: string | null = null;
	let registering = false;

	// Add-a-passkey flow: ask for a label, fetch creation options, run the browser
	// ceremony, then post the response + label to the verify endpoint. All verification
	// happens server-side; we never send credential material beyond the raw `response`.
	let showAddModal = false;
	let newPasskeyLabel = '';

	async function addPasskey() {
		passkeyError = null;
		registering = true;
		try {
			const optionsRes = await fetch('/api/webauthn/register/options', { method: 'POST' });
			if (!optionsRes.ok) {
				passkeyError = m.merry_lone_swan_falter();
				return;
			}
			const optionsJSON = await optionsRes.json();
			const attResp = await startRegistration({ optionsJSON });
			const verifyRes = await fetch('/api/webauthn/register/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ response: attResp, label: newPasskeyLabel })
			});
			if (!verifyRes.ok) {
				passkeyError = m.merry_lone_swan_falter();
				return;
			}
			newPasskeyLabel = '';
			showAddModal = false;
			await invalidateAll();
		} catch (e: unknown) {
			console.error(e);
			passkeyError = m.swift_warm_vole_cancel();
		} finally {
			registering = false;
		}
	}

	// Inline rename: which passkey id is currently being renamed, and the draft label.
	let renamingId: string | null = null;
	let renameLabel = '';
	function startRename(id: string, label: string) {
		renamingId = id;
		renameLabel = label;
	}
</script>

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">
	User Settings for {data.session?.user?.givenName}
	{data.session?.user?.familyName}
</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
	{m.home_vivid_mole_gaze()}
</p>

<form method="POST" action="?/save" class="max-w-2xl">
	<div class="mb-6" class:isError={errors.givenName}>
		<label
			for="settings_givenName"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
			>{m.bright_swift_eagle_given()}</label
		>
		<input
			type="text"
			id="settings_givenName"
			autocomplete="given-name"
			name="givenName"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder={m.lime_placeholder_communityname_gecko()}
			bind:value={formData.givenName}
			required
		/>
		{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.name}</p>{/if}
	</div>

	<div class="mb-6" class:isError={errors.familyName}>
		<label
			for="settings_familyName"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
			>{m.calm_steady_lynx_family()}</label
		>
		<input
			type="text"
			id="settings_familyName"
			autocomplete="family-name"
			name="familyName"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder={m.lime_placeholder_communityname_gecko()}
			bind:value={formData.familyName}
			required
		/>
		{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
				{errors.familyName}
			</p>{/if}
	</div>

	<Heading level="h3" title="Identifiers" />
	<div class="overflow-x-auto relative my-6">
		<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
			<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
				<tr>
					<th scope="col" class="py-3 px-6"> {m.nice_active_giraffe_propel()} </th>
					<th scope="col" class="py-3 px-6"> {m.warm_male_thrush_pout()} </th>
					<th scope="col" class="py-3 px-6"> {m.clear_crazy_meerkat_nurture()} </th>
				</tr>
			</thead>
			<tbody>
				{#each contactIdentifiers as identifier (identifier.id)}
					<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
						<th
							scope="row"
							class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white"
						>
							{identifier.identifier}
						</th>
						<td class="py-4 px-6">
							{identifier.type}
						</td>
						<td class="py-4 px-6">
							<select
								id="identifier_select"
								name="identifierVisibility"
								bind:value={formData.identifierVisibility}
								class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
							>
								<option value="PUBLIC">{m.short_deft_lemur_clasp()}</option>
								<option value="COMMUNITY">{m.equal_small_dolphin_spur()}</option>
								<option value="PRIVATE">{m.pink_last_marten_grin()}</option>
							</select>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div>
		<Heading level="h3" title="Profile">
			{m.calm_brisk_heron_reveal()}
		</Heading>
		<div class="mb-6">
			<label
				for="settings_profileVisibility"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.proud_lunar_otter_show()}</label
			>
			<select
				id="settings_profileVisibility"
				name="profileVisibility"
				bind:value={formData.profileVisibility}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			>
				<option value="PUBLIC">{m.short_deft_lemur_clasp()}</option>
				<option value="COMMUNITY">{m.equal_small_dolphin_spur()}</option>
				<option value="PRIVATE">{m.pink_last_marten_grin()}</option>
			</select>
		</div>
	</div>

	<div>
		<Heading level="h3" title="Badges and Credentials">
			{m.best_sweet_termite_work()}
		</Heading>
		<div class="mb-6" class:isError={errors.givenName}>
			<label
				for="settings_defaultVisibility"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.direct_plane_boar_succeed()}</label
			>
			<select
				id="settings_defaultVisibility"
				name="defaultVisibility"
				bind:value={formData.defaultVisibility}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			>
				<option value="PUBLIC">{m.short_deft_lemur_clasp()}</option>
				<option value="COMMUNITY">{m.equal_small_dolphin_spur()}</option>
				<option value="PRIVATE">{m.pink_last_marten_grin()}</option>
			</select>
			{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.name}</p>{/if}
		</div>

		<div class="mb-6">
			<label class="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-300">
				<input
					type="checkbox"
					name="emailNotifications"
					bind:checked={formData.emailNotifications}
				/>
				{m.merry_bold_swan_notify()}
			</label>
		</div>

		<Button buttonType="submit" submodule="primary">{m.quick_safe_deer_save()}</Button>
	</div>
</form>

<section class="max-w-2xl mt-10">
	<Heading level="h3" title={m.brisk_lush_finch_secure()}>
		{m.snug_brave_otter_explain()}
	</Heading>

	{#if passkeyError}
		<p class="mt-2 text-sm text-red-600 dark:text-red-500">{passkeyError}</p>
	{/if}

	<div class="overflow-x-auto relative my-6">
		{#if (data.passkeys ?? []).length}
			<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
				<thead
					class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
				>
					<tr>
						<th scope="col" class="py-3 px-6"> {m.calm_tidy_owl_label()} </th>
						<th scope="col" class="py-3 px-6"> {m.plump_neat_crow_device()} </th>
						<th scope="col" class="py-3 px-6"> {m.kind_warm_dove_added()} </th>
						<th scope="col" class="py-3 px-6"> {m.lone_soft_hare_used()} </th>
						<th scope="col" class="py-3 px-6"
							><span class="sr-only">{m.fair_keen_swan_act()}</span></th
						>
					</tr>
				</thead>
				<tbody>
					{#each data.passkeys as passkey (passkey.id)}
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 align-top">
							<th
								scope="row"
								class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white"
							>
								{#if renamingId === passkey.id}
									<form
										method="POST"
										action="?/renamePasskey"
										class="flex items-center gap-2"
										use:enhance={() =>
											async ({ update }) => {
												await update();
												renamingId = null;
												await invalidateAll();
											}}
									>
										<input type="hidden" name="id" value={passkey.id} />
										<input
											type="text"
											name="label"
											bind:value={renameLabel}
											class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
										/>
										<Button
											buttonType="submit"
											submodule="primary"
											text={m.quick_safe_deer_save()}
										/>
										<Button
											buttonType="button"
											submodule="secondary"
											text={m.calm_steady_lynx_cancel()}
											onclick={() => (renamingId = null)}
										/>
									</form>
								{:else}
									{passkey.label}
								{/if}
							</th>
							<td class="py-4 px-6">{passkey.deviceType ?? '—'}</td>
							<td class="py-4 px-6">
								{passkey.createdAt ? new Date(passkey.createdAt).toLocaleDateString() : '—'}
							</td>
							<td class="py-4 px-6">
								{passkey.lastUsedAt
									? new Date(passkey.lastUsedAt).toLocaleDateString()
									: m.lone_soft_hare_never()}
							</td>
							<td class="py-4 px-6">
								{#if renamingId !== passkey.id}
									<div class="flex items-center gap-2">
										<Button
											buttonType="button"
											submodule="secondary"
											text={m.gray_swift_mole_rename()}
											onclick={() => startRename(passkey.id, passkey.label)}
										/>
										<form
											method="POST"
											action="?/deletePasskey"
											use:enhance={() =>
												async ({ update }) => {
													await update();
													await invalidateAll();
												}}
										>
											<input type="hidden" name="id" value={passkey.id} />
											<Button
												buttonType="submit"
												submodule="danger"
												text={m.dim_bold_stork_remove()}
											/>
										</form>
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="text-sm text-gray-500 dark:text-gray-400">{m.calm_pale_swan_none()}</p>
		{/if}
	</div>

	<Button
		buttonType="button"
		submodule="primary"
		text={m.brave_lush_finch_add()}
		onclick={() => {
			passkeyError = null;
			newPasskeyLabel = '';
			showAddModal = true;
		}}
	/>
</section>

<Modal
	visible={showAddModal}
	title={m.brave_lush_finch_add()}
	onclose={() => (showAddModal = false)}
	actions={[
		{
			label: m.calm_steady_lynx_cancel(),
			buttonType: 'button',
			submodule: 'secondary',
			onClick: () => (showAddModal = false)
		},
		{
			label: m.brave_lush_finch_add(),
			buttonType: 'button',
			submodule: 'primary',
			onClick: () => addPasskey()
		}
	]}
>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{m.snug_brave_otter_explain()}</p>
	<label
		for="new_passkey_label"
		class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
		>{m.calm_tidy_owl_label()}</label
	>
	<input
		type="text"
		id="new_passkey_label"
		bind:value={newPasskeyLabel}
		disabled={registering}
		placeholder={m.warm_neat_finch_hint()}
		class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
	/>
	{#if passkeyError}
		<p class="mt-2 text-sm text-red-600 dark:text-red-500">{passkeyError}</p>
	{/if}
</Modal>
