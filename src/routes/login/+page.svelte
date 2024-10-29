<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import type { ActionData, PageData, SubmitFunction } from './$types';
	import {
		claimPending,
		claimEmail,
		claimId,
		inviteId,
		inviteCreatedAt
	} from '$lib/stores/activeClaimStore';
	import { onMount } from 'svelte';
	import { nextPath, session } from '$lib/stores/sessionStore';
	import Heading from '$lib/components/Heading.svelte';
	import type { ActionResult } from '@sveltejs/kit';

	export let form: ActionData;
	export let data: PageData;
	let register = false;
	let verificationCode = '';

	let sessionId = form?.sessionId || '';
	let email = $claimEmail || data.inviteeEmail || ''; // Initialize claimEmail but don't necessarily overwrite it in the store?
	let errorMessage = '';

	onMount(() => {
		// Automatically submit the login form if the user previously submitted a badge claim while unauthenticated
		if (data.inviteId) $inviteId = data.inviteId;
		if (data.nextPath && typeof data.nextPath === 'string') $nextPath = data.nextPath;

		if (!form?.sessionId && $claimEmail && $claimPending) {
			const submitButton = document.getElementById('loginFormSubmit');
			if (submitButton instanceof HTMLElement) submitButton.click();
		}
	});

	const registerHandler: SubmitFunction = () => {
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'error') {
				errorMessage = result.error.message;
				// TODO: specifically handle the case where the invite was stale
				if (result.error.code === 'invite_expired') {
					const formData = new URLSearchParams();
					formData.append('inviteId', $inviteId);
					formData.append('email', email);
					const loginResult = await fetch('/login', {
						method: 'POST',
						body: formData.toString(),
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded'
						}
					});
					if (loginResult.status == 200) {
						const loginData = await loginResult.json();
						sessionId = loginData.sessionId;
					} else {
						errorMessage = m.authentication_couldNotLogIn();
					}
				}
			} else if (result.type === 'success' && result.data?.session) {
				const data = result.data;
				$session = data.session as App.SessionData;
				goto(data.location ?? $nextPath ?? '/');
				$nextPath = undefined;
				console.log('Processed nextPath and reset.');
			}
		};
	};

	const verifyHandler: SubmitFunction = () => {
		return ({ result }: { result: ActionResult }) => {
			if (result.type === 'success' && result.data?.register) {
				register = true;
			} else if (result.type === 'error') {
				errorMessage = result.error?.message;
			} else if (result.type === 'success') {
				$session = result.data?.session;

				goto(result.data?.location);
				$nextPath = undefined;
				console.log('Processed nextPath and reset.');
			}
		};
	};

	const loginHandler: SubmitFunction = () => {
		return ({ result, update }) => {
			if (result.type === 'success') sessionId = result.data?.sessionId ?? '';
			else if (result.type === 'error') errorMessage = result.error?.message;
			update();
		};
	};
</script>

<div
	class="mt-8 shadow-md bg-white dark:bg-gray-800 dark:border-gray-700 p-8 rounded-xl mx-auto max-w-2xl"
>
	{#if register || (!sessionId && Date.now() < ($inviteCreatedAt?.getTime() ?? 0) + 86400000)}
		<!-- Step 3: User needs to fill out the rest of the registration form. -->
		<!-- Or a user goes directly here if they have a fresh (less than 1 day old) invite -->
		<Heading title={m.logInCTA()} description={m.loginInviteCTA_description()} />
		<form
			id="registerForm"
			method="POST"
			action="?/register"
			on:submit={() => {
				errorMessage = '';
			}}
			use:enhance={registerHandler}
		>
			{#if $inviteId}
				<input type="hidden" id="registerInviteId" name="inviteId" value={$inviteId} />
			{/if}
			<input
				type="hidden"
				id="registerVerificationCode"
				name="verificationCode"
				bind:value={verificationCode}
			/>
			{#if errorMessage}
				<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errorMessage}
				</p>
			{/if}

			<div class="mb-6">
				<label
					for="register_givenName"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>
					{m.givenName()}
				</label>
				<input
					type="text"
					id="register_givenName"
					name="givenName"
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="Alice"
					required
				/>
			</div>

			<div class="mb-6">
				<label
					for="register_familyName"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>
					{m.familyName()}
				</label>
				<input
					type="text"
					id="register_familyName"
					name="familyName"
					class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					required
				/>
			</div>

			<div class="mb-6">
				<div class="flex items-center">
					<input
						id="register_agreeTerms"
						type="checkbox"
						name="agreeTerms"
						class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
					/>
					<label
						for="register_agreeTerms"
						class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>
						{m.tos_agreementCTA_description()}
					</label>
				</div>
			</div>

			<Button buttonType="submit" text={m.submitCTA()} />
		</form>
	{:else if sessionId}
		<!-- Step 2: Verify control of email to activate session -->
		<Heading title={m.logInCTA()} description={m.login_checkEmailCTA_description()} />
		<form id="verifyForm" method="POST" action="?/verify" use:enhance={verifyHandler}>
			<input type="hidden" id="inviteId" name="inviteId" bind:value={$inviteId} />
			<div class="mt-7">
				<label
					for="verificationCode"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>
					{m.verificationCode()}
				</label>
				<input
					type="number"
					min="100000"
					max="999999"
					id="verificationCode"
					name="verificationCode"
					class="bg-gray-50 max-w-xs border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="000000"
					bind:value={verificationCode}
					required
				/>
				{#if $nextPath}
					<input type="hidden" name="nextPath" id="verificationNextPath" bind:value={$nextPath} />
				{/if}
				{#if errorMessage}
					<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errorMessage}
					</p>
				{/if}
			</div>
			<div class="mt-5">
				<Button buttonType="submit" text={m.submitCTA()} />
			</div>
		</form>
	{:else}
		<!-- Step 1: Enter email to login -->

		{#if !$inviteId}
			<Heading title={m.logInCTA()} description={m.loginCTA_description()} />
		{:else}
			<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">{m.loginInviteCTA()}</h1>
			<p class="my-4 text-sm text-gray-500 dark:text-gray-400">
				{m.inviteJoinCTA_description({ name: data.org.name })}
			</p>
		{/if}
		<form id="loginForm" method="POST" action="?/login" use:enhance={loginHandler}>
			{#if $inviteId}
				<input type="hidden" id="inviteId" name="inviteId" value={$inviteId} />
			{/if}
			<div class="mt-7">
				<label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>{m.yourEmail()}</label
				>
				<input
					type="email"
					id="email"
					name="email"
					class="max-w-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder="name@mycommunity.com"
					required
					bind:value={email}
				/>
				{#if errorMessage}
					<p class="mt-2 text-sm text-red-600 dark:text-red-500">
						{errorMessage}
					</p>
				{/if}
			</div>
			<div class="mt-5">
				<Button id="loginFormSubmit" buttonType="submit" text={m.login_sendCodeCTA()} />
			</div>
		</form>
	{/if}
</div>
