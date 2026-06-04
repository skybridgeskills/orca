<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import EmptyStateZone from '$lib/components/EmptyStateZone.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import * as m from '$lib/i18n/messages';

	import type { PageData } from './$types';

	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	// Scope URIs (mirrors $lib/server/oauth/scopes, which is server-only and
	// cannot be imported here). Reuse the consent screen's human-readable labels;
	// unknown scopes are shown verbatim (the server only stores supported ones).
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

	function lastUsedLabel(lastUsedAt: string | null): string {
		if (!lastUsedAt) return m.witty_calm_robin_rest();
		return m.jolly_dusky_finch_track({ date: new Date(lastUsedAt).toLocaleDateString() });
	}
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
	<Heading
		title={m.breezy_amber_lynx_connect()}
		description={m.gentle_lunar_otter_browse()}
		level="h1"
	/>

	{#if data.apps.length === 0}
		<EmptyStateZone description={m.mellow_swift_heron_pause()} />
	{:else}
		<ul class="flex flex-col gap-4">
			{#each data.apps as app (app.clientInternalId)}
				<Card maxWidth="max-w-3xl">
					<div class="flex items-start gap-4">
						{#if app.logoUri}
							<img
								src={app.logoUri}
								alt={app.clientName}
								class="h-12 w-12 rounded-lg object-contain shrink-0"
							/>
						{/if}
						<div class="grow">
							{#if app.clientUri}
								<a
									href={app.clientUri}
									target="_blank"
									rel="noopener noreferrer external"
									class="text-lg font-bold text-blue-600 hover:underline dark:text-blue-400"
								>
									{app.clientName}
								</a>
							{:else}
								<span class="text-lg font-bold text-gray-900 dark:text-white">
									{app.clientName}
								</span>
							{/if}

							<div class="mt-2 flex flex-wrap gap-2">
								{#each app.scopes as scope (scope)}
									<span
										class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200"
									>
										{scopeLabel(scope)}
									</span>
								{/each}
							</div>

							<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
								{lastUsedLabel(app.lastUsedAt)}
							</p>
						</div>

						<form
							method="POST"
							action="?/revoke"
							use:enhance={({ cancel }) => {
								if (!confirm(m.clever_misty_quail_warn({ appName: app.clientName }))) {
									cancel();
								}
							}}
						>
							<input type="hidden" name="clientInternalId" value={app.clientInternalId} />
							<Button buttonType="submit" submodule="danger">
								{m.sturdy_amber_vole_revoke()}
							</Button>
						</form>
					</div>
				</Card>
			{/each}
		</ul>
	{/if}
</div>
