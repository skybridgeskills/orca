<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import Button from '$lib/components/Button.svelte';
	import ButtonGroup from '$lib/components/ButtonGroup.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import type { ActionData, PageData } from './$types';
	import type { Passkey } from '@prisma/client';
	import { enhance } from '$app/forms';
	import { startRegistration } from '@simplewebauthn/browser';
	import { createRegistrationOptionsForUser, verifyUserPasskey } from '$lib/utils/passkeys';
	import Modal from '$lib/components/Modal.svelte';
	import { json, type ActionResult, type SubmitFunction } from '@sveltejs/kit';
	import { Data } from 'ws';
	import { submitCTA } from '$lib/i18n/messages';
	import { tick } from 'svelte';
	import { notifications, Notification } from '$lib/stores/notificationStore';
	import * as m from '$lib/i18n/messages';
	
	export let data: PageData;

	const noErrors: { [key: string]: string | null } = {
		givenName: null,
		familyName: null,
		identifierVisibility: null,
		defaultVisibility: null,
		newPasskey: null
	};

	const passkeyJSON = (passkey: any, key: any) => {
		if (key == 'timestamp') {
			let pskDate = passkey[key];
			pskDate = Date.parse(pskDate);
			pskDate = new Date(pskDate);
			const day = pskDate.getDate();
			const month = pskDate.getMonth() + 1;
			const year = pskDate.getFullYear();
			pskDate = `${month}/${day}/${year}`;
			return pskDate;
		} else {
			return passkey[key];
		}
	};
	//hm: ask the user for a label

	let errors = { ...noErrors };

	let formData = {
		givenName: data.session?.user?.givenName ?? '',
		familyName: data.session?.user?.familyName ?? '',
		identifierVisibility:
			data.session?.user?.identifiers.find((a) => true)?.visibility ?? 'COMMUNITY',
		defaultVisibility: data.session?.user?.defaultVisibility ?? 'COMMUNITY',
		newPasskey: ''
	};

	let modalTitle = '';

	let passkeyGenerating = false;
	let finished = true;
	let errorString: string = '';
	let userVerified = false;
	const originURL = data.org.domain; // localhost:5173. presumably data.org.url has the full URL

	const setLoadingTitle = () => {
		if (passkeyGenerating && !errorString) {
			modalTitle = 'Loading...';
		} else if (userVerified) {
			modalTitle = 'Success!';
		} else {
			modalTitle = 'There has been an error.';
		}
	};

	const handlePasskey = async () => {
		finished = false;
		userVerified = false;
		passkeyGenerating = true;

		errorString = '';

		let userData;
		let optionsJSON;
		let browserResponse;
		let verification;

		//let domain = originURL.split("http://")
		let localHostDomain = originURL.split(':')[0]; //hm: only for localhost. Need to test the previous split with an actual URL

		if (data.session?.user != null) {
			userData = data.session?.user;
			//optionsJSON = await createRegistrationOptionsForUser(userData, domain[0])
			optionsJSON = await createRegistrationOptionsForUser(userData, localHostDomain);

			try {
				browserResponse = await startRegistration({ optionsJSON });
			} catch (error) {
				errorString = String(error);
				throw error;
			}
			try {
				//verification = await verifyUserPasskey(browserResponse, optionsJSON.challenge, originURL)
				verification = await verifyUserPasskey(
					browserResponse,
					optionsJSON.challenge,
					'http://' + originURL
				);
				optionsJSON.challenge = '';
				userVerified = verification?.registrationInfo?.userVerified!!;

				//hm: task - put the appropriate data into a json data structure. and the rest into the actual data structure.
				//hm: what is the appropriate data to go into the JSON data structure, and what should go into the actual data structure?

				//hm: get the passkey data structure in here to begin with so you can reference it WOOHOO!
				const userDevice: string = navigator.userAgent;
				formData.newPasskey = JSON.stringify({
					device: userDevice,
					publicKey: verification?.registrationInfo?.credential.publicKey,
					transports: verification?.registrationInfo?.credential.transports,
					deviceType: verification?.registrationInfo?.credentialDeviceType,
					backedUp: verification?.registrationInfo?.credentialBackedUp,
					timestamp: new Date(Date.now()).toISOString()
				});

				const form = document.getElementById('newPassKeyForm') as HTMLFormElement;
				const button = document.getElementById('hiddenSubmit') as HTMLFormElement;
				const temp_input = document.getElementById('settings_passkeycreate') as HTMLFormElement;

				if (form) {
					await tick();
					form.submit();
				}

				if(userVerified) {
					notifications.addNotification(new Notification(m.topical_clear_gadfly_gaze(), true, 'success'))
				}

				passkeyGenerating = false;
			} catch (error) {
				errorString = String(error);
				throw error;
			}
		} else {
			errorString = 'Error: Could not find the user to create a passkey for.';
		}
	};
	let errorMessage = '';

	const addPasskey = () => {
		finished = true;

		return ({ result }: { result: ActionResult }) => {
			if (result.type === 'error') errorMessage = result.error?.message;
			else if (result.type === 'success' && result.data?.passkey) {
				const data = result.data;
				console.log(data);
			} else {
				alert("There's an issue: " + errorMessage);
			}
		};
	};

	let delKey = false;
	let verifyDelete = false;

	const deletePasskey = () => {
		delKey = true;
		
	};

	const deletePasskeyHelper = () => {


			alert('Passkey deleted');
			verifyDelete = false;
			delKey = false;


	};
</script>

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">
	User Settings for {data.session?.user?.givenName}
	{data.session?.user?.familyName}
</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
	{m.home_vivid_mole_gaze()}
</p>

<form action="?/save" method="POST" class="max-w-2xl">
	<div class="mb-6" class:isError={errors.givenName}>
		<label
			for="settings_givenName"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">{m.givenName()}</label
		>
		<input
			type="text"
			id="settings_givenName"
			autocomplete="given-name"
			name="givenName"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="My Org"
			bind:value={formData.givenName}
			required
		/>
		{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.name}</p>{/if}
	</div>

	<div class="mb-6" class:isError={errors.familyName}>
		<label
			for="settings_familyName"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
			>{m.familyName()}</label
		>
		<input
			type="text"
			id="settings_familyName"
			autocomplete="family-name"
			name="familyName"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="My Org"
			bind:value={formData.familyName}
			required
		/>
		{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
				{errors.familyName}
			</p>{/if}
	</div>

	<Heading level="h3" title="Identifiers" />
	<div class="overflow-x-auto relative my-6 z-0">
		<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
			<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
				<tr>
					<th scope="col" class="py-3 px-6"> {m.nice_active_giraffe_propel()} </th>
					<th scope="col" class="py-3 px-6"> {m.warm_male_thrush_pout()} </th>
					<th scope="col" class="py-3 px-6"> {m.clear_crazy_meerkat_nurture()} </th>
				</tr>
			</thead>
			{#each data.session?.user?.identifiers ?? [] as identifier}
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
		</table>
	</div>
	<!-- Passkeys implementation -->
	<Heading level="h3" title="Passkeys"></Heading>
	<p class="mb-5 -mt-2 text-sm text-gray-500 dark:text-gray-400">
		Passkeys are a way to login without a password. View and manage your passkeys here, or add a new
		one.
	</p>
	<div class="overflow-x-auto relative my-6 z-0">
		{#if data.passkeys.length != 0}
			<table class="table-auto text-sm text-left text-gray-500 dark:text-gray-400">
				<thead
					class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
				>
					<tr>
						<th scope="col" class="py-3 pl-6"> Device </th>
						<th scope="col" class="py-3 pr-8"> Date Created </th>
						<th scope="col" class="py-3 pl-2"> Actions </th>
					</tr>
				</thead>
				{#each data.passkeys ?? [] as passkey}
					<tbody>
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
							<th scope="row" class="py-4 px-6 font-medium text-gray-900 dark:text-white">
								<p>{passkeyJSON(passkey.json, 'device')}</p>
							</th>
							<td class="py-4">
								{passkeyJSON(passkey.json, 'timestamp')}
							</td>
							<td class="py-4">
								<Button buttonType="button" on:click={() => deletePasskey()} submodule="secondary"
									>Delete</Button
								>
							</td>
						</tr>
					</tbody>
				{/each}
			</table>
		{/if}
		<Button on:click={() => handlePasskey()} class="my-5" buttonType="button"
			>Add New Passkey</Button
		>
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

		<Button buttonType="submit" submodule="primary">{m.saveCTA()}</Button>
	</div>
</form>

<Modal
	id="passkey-delete-modal"
	title={modalTitle}
	visible={delKey && !verifyDelete}
	on:close={() => {
		delKey = false
	}}
	actions={[]}
>


	<Button buttonType="button" on:click={() => deletePasskeyHelper()} submodule="primary"
		>Yes, I'm sure</Button
	>
	<Button buttonType="button" on:click={() => (delKey = false)} submodule="primary">No, take me back</Button>
</Modal>

<Modal
	id="passkey-loading-modal"
	title={modalTitle}
	visible={!finished}
	on:close={() => {
		finished = true;
	}}
	actions={[]}
>
	<form id="newPassKeyForm" action="?/savePasskey" method="POST" use:enhance>
		<button type="submit" class="hidden" id="hiddenSubmit">Submit</button>
		<input id="settings_passkeycreate" name="newPasskey" value={formData.newPasskey} />

		{#if passkeyGenerating && !errorString}
			<p class=" -mt-5 mb-6 text-sm text-gray-500 dark:text-gray-400 max-w-prose p-6">
				Please continue configuring your passkey using the pop-up.
			</p>
		{:else if userVerified}
			<p>{formData.newPasskey}</p>
			<p class=" -mt-5 mb-6 text-sm text-gray-500 dark:text-gray-400 max-w-prose p-6">
				Your passkey has been successfully generated. You can close this popup.
			</p>

		{:else}
			<p class=" -mt-5 text-sm text-gray-500 dark:text-gray-400 max-w-prose p-6">
				Your passkey could not be created. <br /> <br />{errorString}
			</p>
		{/if}
	</form>
</Modal>
