<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Scope URIs (mirrors $lib/server/oauth/scopes, which is server-only and
	// cannot be imported here). Map each granted scope to a human-readable label;
	// unknown scopes are shown verbatim (the server already restricts to supported).
	const SCOPE_CREDENTIAL_READONLY =
		'https://purl.imsglobal.org/spec/ob/v3p0/scope/credential.readonly';
	const SCOPE_OFFLINE_ACCESS = 'offline_access';

	function scopeLabel(scope: string): string {
		switch (scope) {
			case SCOPE_CREDENTIAL_READONLY:
				return m.snappy_amber_finch_read();
			case SCOPE_OFFLINE_ACCESS:
				return m.plucky_misty_marten_stay();
			default:
				return scope;
		}
	}
</script>

<div class="flex justify-center py-10 px-4">
	{#if data.fatalError}
		<Card maxWidth="max-w-md">
			<h1 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
				{m.mellow_brisk_otter_link()}
			</h1>
			<p class="text-sm text-gray-600 dark:text-gray-300">
				{m.gentle_rapid_swan_verify()}
			</p>
		</Card>
	{:else if data.client}
		<Card maxWidth="max-w-md">
			<div class="flex flex-col items-center text-center">
				{#if data.client.logoUri}
					<img
						src={data.client.logoUri}
						alt={data.client.clientName}
						class="h-16 w-16 rounded-lg object-contain mb-4"
					/>
				{/if}
				<h1 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
					{m.mellow_brisk_otter_link()}
				</h1>
				<p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
					{m.jolly_cosmic_heron_greet({ appName: data.client.clientName })}
				</p>
			</div>

			<p class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">
				{m.witty_lunar_badger_gather()}
			</p>
			<ul class="mb-4 list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
				{#each data.scopes as scope (scope)}
					<li>{scopeLabel(scope)}</li>
				{/each}
			</ul>
			<div class="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
				{#if data.client.tosUri}
					<a
						href={data.client.tosUri}
						target="_blank"
						rel="noopener noreferrer external"
						class="text-blue-600 hover:underline dark:text-blue-400"
					>
						{m.merry_silver_robin_terms()}
					</a>
				{/if}
				{#if data.client.policyUri}
					<a
						href={data.client.policyUri}
						target="_blank"
						rel="noopener noreferrer external"
						class="text-blue-600 hover:underline dark:text-blue-400"
					>
						{m.clever_dusky_quail_privacy()}
					</a>
				{/if}
				{#if data.client.clientUri}
					<a
						href={data.client.clientUri}
						target="_blank"
						rel="noopener noreferrer external"
						class="text-blue-600 hover:underline dark:text-blue-400"
					>
						{m.quirky_solar_lynx_visit()}
					</a>
				{/if}
			</div>

			<form method="POST" class="flex gap-3">
				<input type="hidden" name="clientId" value={data.params.clientId} />
				<input type="hidden" name="redirectUri" value={data.params.redirectUri} />
				<input type="hidden" name="state" value={data.params.state} />
				<input type="hidden" name="codeChallenge" value={data.params.codeChallenge} />
				<input type="hidden" name="codeChallengeMethod" value={data.params.codeChallengeMethod} />
				<input type="hidden" name="scope" value={data.params.scope} />

				<Button buttonType="submit" submodule="secondary" moreProps={{ formaction: '?/deny' }}>
					{m.sturdy_keen_vole_deny()}
				</Button>
				<Button buttonType="submit" submodule="primary" moreProps={{ formaction: '?/approve' }}>
					{m.breezy_noble_crane_allow()}
				</Button>
			</form>
		</Card>
	{/if}
</div>
