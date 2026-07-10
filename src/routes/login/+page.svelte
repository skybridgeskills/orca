<script lang="ts">
	import { startAuthentication } from '@simplewebauthn/browser';
	import type { ActionResult } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import Button from '$lib/components/Button.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import * as m from '$lib/i18n/messages';
	import {
		claimPending,
		claimEmail,
		inviteId,
		inviteCreatedAt
	} from '$lib/stores/activeClaimStore';
	import { nextPath } from '$lib/stores/sessionStore';

	import type { ActionData, PageData, SubmitFunction } from './$types';

	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';

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
					const formData = new SvelteURLSearchParams();
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
						errorMessage = m.plane_sad_guppy_support();
					}
				}
			} else if (result.type === 'success' && result.data?.session) {
				const data = result.data;
				await invalidateAll();
				await goto(resolve(data.location ?? $nextPath ?? '/'));
				$nextPath = undefined;
			}
		};
	};

	// Superadmin-org 2FA: when the email `verify` step returns `needsPasskey`, the session's
	// email factor is satisfied but it is NOT yet valid. We hold the returned authentication
	// options and intended destination, show the passkey step, and finish via the 2FA verify
	// endpoint. The whole ceremony is bound to the same cookie session server-side.
	let needsPasskey = false;
	let twoFactorOptions: unknown = undefined;
	let twoFactorLocation = '/';
	let twoFactorPending = false;

	const verifyHandler: SubmitFunction = () => {
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'success' && result.data?.register) {
				register = true;
			} else if (result.type === 'success' && result.data?.needsPasskey) {
				errorMessage = '';
				twoFactorOptions = result.data.options;
				twoFactorLocation = result.data.location ?? $nextPath ?? '/';
				needsPasskey = true;
			} else if (result.type === 'error') {
				errorMessage = result.error?.message;
			} else if (result.type === 'success') {
				await invalidateAll();
				await goto(resolve(result.data?.location ?? '/'));
				$nextPath = undefined;
			}
		};
	};

	// Run the passkey assertion for the email-verified session and post it to the 2FA verify
	// endpoint. On success, mirror the normal login path (set the session store + navigate).
	// Cancel/failure keeps the user on the 2FA step; the email factor stays satisfied for the
	// session TTL, so they can retry without re-entering the code.
	async function confirmWithPasskey() {
		if (!twoFactorOptions) return;
		errorMessage = '';
		twoFactorPending = true;
		try {
			const response = await startAuthentication({
				optionsJSON: twoFactorOptions as Parameters<typeof startAuthentication>[0]['optionsJSON']
			});
			const verifyRes = await fetch('/api/webauthn/2fa/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ response, next: twoFactorLocation })
			});
			if (!verifyRes.ok) {
				errorMessage = m.mellow_brisk_hawk_failed();
				return;
			}
			const data = await verifyRes.json();
			if (data?.ok && data?.session) {
				await invalidateAll();
				await goto(resolve(data.location ?? twoFactorLocation));
				$nextPath = undefined;
			} else {
				errorMessage = m.mellow_brisk_hawk_failed();
			}
		} catch {
			// User cancelled or no usable credential — stay on the 2FA step with an error.
			errorMessage = m.gentle_mild_otter_cancel();
		} finally {
			twoFactorPending = false;
		}
	}

	const loginHandler: SubmitFunction = () => {
		return ({ result, update }) => {
			if (result.type === 'success')
				sessionId = result.data && 'sessionId' in result.data ? (result.data.sessionId ?? '') : '';
			else if (result.type === 'error') errorMessage = result.error?.message;
			update();
		};
	};

	// Usernameless passkey login: fetch discoverable authentication options, run the
	// browser ceremony, post the assertion to the verify endpoint, then mirror the email
	// `verify` path (set the session store + navigate to the returned location). All
	// verification + identity resolution happens server-side.
	let passkeyPending = false;
	async function signInWithPasskey() {
		errorMessage = '';
		passkeyPending = true;
		try {
			const optionsRes = await fetch('/api/webauthn/authenticate/options', { method: 'POST' });
			if (!optionsRes.ok) {
				errorMessage = m.glossy_lucky_swan_unauth();
				return;
			}
			const optionsJSON = await optionsRes.json();
			const response = await startAuthentication({ optionsJSON });
			const verifyRes = await fetch('/api/webauthn/authenticate/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ response, next: $nextPath ?? undefined })
			});
			if (!verifyRes.ok) {
				errorMessage = m.glossy_lucky_swan_unauth();
				return;
			}
			const data = await verifyRes.json();
			if (data?.ok && data?.session) {
				await invalidateAll();
				await goto(resolve(data.location ?? $nextPath ?? '/'));
				$nextPath = undefined;
			} else {
				errorMessage = m.glossy_lucky_swan_unauth();
			}
		} catch {
			// User cancelled, or no usable credential — the browser throws here.
			errorMessage = m.gentle_mild_otter_cancel();
		} finally {
			passkeyPending = false;
		}
	}
</script>

<div
	class="mt-8 shadow-md bg-white dark:bg-gray-800 dark:border-gray-700 p-8 rounded-xl mx-auto max-w-2xl"
>
	<!-- if the invite is less than 24 hours old no login code required, just use inviteId secret -->
	{#if needsPasskey}
		<!-- Superadmin-org 2FA: email verified, now confirm with a passkey to finish. -->
		<Heading title={m.bright_swift_eagle_login()} description={m.brave_calm_heron_confirm()} />
		{#if errorMessage}
			<p class="mt-2 text-sm text-red-600 dark:text-red-500">
				{errorMessage}
			</p>
		{/if}
		<div class="mt-5">
			<Button
				id="twoFactorPasskeyButton"
				buttonType="button"
				disabled={twoFactorPending}
				text={m.swift_keen_otter_finish()}
				onclick={confirmWithPasskey}
			/>
		</div>
	{:else if register || (!sessionId && Date.now() < ($inviteCreatedAt?.getTime() ?? 0) + 86400000)}
		<!-- Step 3: User needs to fill out the rest of the registration form. -->
		<!-- Or a user goes directly here if they have a fresh (less than 1 day old) invite -->
		<Heading
			title={m.bright_swift_eagle_login()}
			description={m.gentle_brave_falcon_logininvdesc()}
		/>
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
					{m.bright_swift_eagle_given()}
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
					{m.calm_steady_lynx_family()}
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
						class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
					/>
					<label
						for="register_agreeTerms"
						class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>
						{m.bright_sea_sparrow_work()}
					</label>
				</div>
			</div>

			<Button buttonType="submit" text={m.bold_swift_eagle_submit()} />
		</form>
	{:else if sessionId}
		<!-- Step 2: Verify control of email to activate session -->
		<Heading title={m.bright_swift_eagle_login()} description={m.tired_soft_goat_cherish()} />
		<form id="verifyForm" method="POST" action="?/verify" use:enhance={verifyHandler}>
			<input type="hidden" id="inviteId" name="inviteId" bind:value={$inviteId} />
			<div class="mt-7">
				<label
					for="verificationCode"
					class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>
					{m.quick_safe_deer_verify()}
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
				<Button buttonType="submit" text={m.bold_swift_eagle_submit()} />
			</div>
		</form>
	{:else}
		<!-- Step 1: Enter email to login -->

		{#if !$inviteId}
			<Heading
				title={m.bright_swift_eagle_login()}
				description={m.fresh_bright_sparrow_logindesc()}
			/>
		{:else}
			<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">{m.warm_tangy_deer_logininvite()}</h1>
			<p class="my-4 text-sm text-gray-500 dark:text-gray-400">
				{m.quick_clear_owl_invitejoin({ name: data.org.name })}
			</p>
		{/if}
		<form id="loginForm" method="POST" action="?/login" use:enhance={loginHandler}>
			{#if $inviteId}
				<input type="hidden" id="inviteId" name="inviteId" value={$inviteId} />
			{/if}
			<div class="mt-7">
				<label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
					>{m.firm_clear_fox_email()}</label
				>
				<input
					type="email"
					id="email"
					name="email"
					class="max-w-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
					placeholder={m.few_seemly_mare_propel()}
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
				<Button id="loginFormSubmit" buttonType="submit" text={m.early_next_seahorse_change()} />
			</div>
		</form>
		<div class="mt-5">
			<Button
				id="passkeyLoginButton"
				submodule="secondary"
				disabled={passkeyPending}
				text={m.proud_swift_eagle_signin()}
				onclick={signInWithPasskey}
			/>
		</div>
	{/if}
</div>
