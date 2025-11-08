<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { startRegistration } from '@simplewebauthn/browser';
	import { createRegistrationOptionsForUser, verifyUserPasskey } from '$lib/utils/passkeys';
	import Modal from '$lib/components/Modal.svelte';
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
		} else if(key == "account") {
			return passkey.account.identifier
		} else {
			return passkey[key];
		}
	};

	let errors = { ...noErrors };

	let formData = {
		givenName: data.session?.user?.givenName ?? '',
		familyName: data.session?.user?.familyName ?? '',
		identifierVisibility:
			data.session?.user?.identifiers.find((a) => true)?.visibility ?? 'COMMUNITY',
		defaultVisibility: data.session?.user?.defaultVisibility ?? 'COMMUNITY',
		newPasskey: '',
		delpasskeyID: ''
	};

	let originURLHost = "localhost";
	let originURLProtocol = 'http://'
		if (typeof window !== 'undefined') {
		originURLHost = window.location.host; 
		originURLProtocol = window.location.protocol; 
	} 


	let modalTitle = '';

	let passkeyGenerating = false;
	let finished = true;
	let errorString: string = '';
	let userVerified = false;

	const handlePasskey = async () => {
		finished = false;
		userVerified = false;
		passkeyGenerating = true;
		modalTitle = 'Loading...';
		errorString = '';

		let userData;
		let optionsJSON;
		let browserResponse;
		let verification;


		if (data.session?.user != null) {
			userData = data.session?.user;
	
			//Expects just the host name
			optionsJSON = await createRegistrationOptionsForUser(userData, originURLHost.replace(":" + window.location.port, ""))
		
			
			try {
				browserResponse = await startRegistration({ optionsJSON });
			} catch (error) {
				finished = true
				notifications.addNotification(new Notification("Passkey unable to be created. Please try again", true, 'error'))

				//modalTitle = 'There has been an error.';
				errorString = String(error);
				throw error;
			}
			try {
				verification = await verifyUserPasskey(
					browserResponse,
					optionsJSON.challenge,
					originURLProtocol + "//" + originURLHost //Expects the full URL
				);
				optionsJSON.challenge = '';
				userVerified = verification?.registrationInfo?.userVerified!!;

				const userDevice: string = navigator.userAgent;
				formData.newPasskey = JSON.stringify({
					device: userDevice,
					registration: verification?.registrationInfo,
					timestamp: new Date(Date.now()).toISOString(),
					account: data.session?.user?.identifiers[0],
					domain: data.org.domain
				});

				const form = document.getElementById('newPassKeyForm') as HTMLFormElement;


				if (form) {
					await tick();
					form.requestSubmit();
				}
				modalTitle = 'Success!';
				finished = true

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

	let delKey = false;
	let verifyDelete = false;

	const deletePasskey = (passkey_id: string) => {
		delKey = true;
		formData.delpasskeyID = passkey_id;
	};

	const deletePasskeyHelper = async () => {
			
		const form = document.getElementById('delPassKeyForm') as HTMLFormElement;

		if (form) {
			await tick();
			form.requestSubmit();
		}

		formData.delpasskeyID = "";

		notifications.addNotification(new Notification("Passkey deleted", true, 'success'))

		verifyDelete = false;
		delKey = false;
	};
</script>

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">
	User Settings for {data.session?.user?.givenName}
	{data.session?.user?.familyName}
</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
	You can control how your profile is displayed to other users in the community and how your
	credentials are delivered to you.
</p>

<form action="?/save" method="POST" class="max-w-2xl">
	<div class="mb-6" class:isError={errors.givenName}>
		<label
			for="settings_givenName"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Given Name</label
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
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Family Name</label
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
	<div class="overflow-x-auto my-6 z-0">
		<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
			<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
				<tr>
					<th scope="col" class="py-3 px-6"> Identifier </th>
					<th scope="col" class="py-3 px-6"> Type </th>
					<th scope="col" class="py-3 px-6"> Visibility </th>
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
							<option value="PUBLIC">Public</option>
							<option value="COMMUNITY">Community members only</option>
							<option value="PRIVATE">Private (admins only)</option>
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
	<div class="overflow-x-auto my-6 z-0">
		{#if data.passkeys.length != 0}
			<table class="table-auto text-sm text-left text-gray-500 dark:text-gray-400">
				<thead
					class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
				>
					<tr>
						<th scope="col" class="py-3 pl-6"> Email </th>
						<th scope="col" class="py-3 pr-8"> Date Created </th>
						<th scope="col" class="py-3 pl-2"> Actions </th>
					</tr>
				</thead>
				{#each data.passkeys ?? [] as passkey}
					<tbody>
						<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
							<th scope="row" class="py-4 px-6 font-medium text-gray-900 dark:text-white">
								<p>{passkeyJSON(passkey.json, 'account')}</p>
							</th>

							<td class="py-4">
								{passkeyJSON(passkey.json, 'timestamp')}
							</td>
							<td class="py-4">
								<Button buttonType="button" on:click={() => deletePasskey(passkey.id)} submodule="secondary"
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
			Who can see the badges you've earned by default? You can choose to override this for each
			individual badge.
		</Heading>
		<div class="mb-6" class:isError={errors.givenName}>
			<label
				for="settings_defaultVisibility"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>Default badge visibility</label
			>
			<select
				id="settings_defaultVisibility"
				name="defaultVisibility"
				bind:value={formData.defaultVisibility}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			>
				<option value="PUBLIC">Public</option>
				<option value="COMMUNITY">Community members only</option>
				<option value="PRIVATE">Private (admins only)</option>
			</select>
			{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.name}</p>{/if}
		</div>

		<Button buttonType="submit" submodule="primary">Save</Button>
	</div>
</form>

<Modal
	id="passkey-delete-modal"
	title={"Confirm Deletion"}
	visible={delKey && !verifyDelete}
	on:close={() => {
		delKey = false
	}}
	actions={[]}
>
<p class=" -mt-5 mb-6 text-sm text-gray-500 dark:text-gray-400 max-w-prose p-6">Are you sure you would like to delete this passkey? You won't be able to log in with this credential in the future.
	<div class="flex ml-80">
	<form id="delPassKeyForm" action="?/deletePasskey" method="POST" use:enhance>
	<Button buttonType="button" on:click={() => deletePasskeyHelper()} submodule="primary">
		Yes, I'm sure
	</Button>
	<input type="hidden" id="settings_passkeydelete" name="delpasskeyID" bind:value={formData.delpasskeyID}/>
</form>

	<Button buttonType="button" on:click={() => (delKey = false)} submodule="primary">No, take me back</Button>
	</div>
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
	<form id="newPassKeyForm" action="?/savePasskey" method="POST"  use:enhance>
		<button type="submit" class="hidden" id="hiddenSubmit">Submit</button>
		<input  type="hidden" id="settings_passkeycreate" name="newPasskey" value={formData.newPasskey} />

		{#if passkeyGenerating && !errorString}
			<p class=" -mt-5 mb-6 text-sm text-gray-500 dark:text-gray-400 max-w-prose p-6">
				Please continue configuring your passkey using the pop-up.
			</p>
		{:else if userVerified}
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
