<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import EmptyStateZone from '$lib/components/EmptyStateZone.svelte';
	import FormFieldLabel from '$lib/components/forms/FormFieldLabel.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import * as m from '$lib/i18n/messages';

	import type { ActionData, PageData } from './$types';

	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const inputClass =
		'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500';

	let showAddModal = $state(false);
	let justCreated = $state<{ clientId: string; clientSecret: string } | null>(null);
	let confirmTarget = $state<{ id: string; name: string; action: 'disable' | 'delete' } | null>(
		null
	);

	const createError = $derived(form && 'createError' in form ? form.createError : null);

	const confirmTitle = $derived(
		confirmTarget
			? confirmTarget.action === 'delete'
				? m.bleak_swift_raven_purge({ appName: confirmTarget.name })
				: m.stark_dim_crow_warn({ appName: confirmTarget.name })
			: ''
	);

	function openAddModal() {
		justCreated = null;
		showAddModal = true;
	}

	function closeAddModal() {
		showAddModal = false;
		justCreated = null;
	}

	function scopeLabel(scope: string): string {
		switch (scope) {
			case 'AchievementClaim.readonly':
				return m.lively_amber_finch_view();
			default:
				return scope;
		}
	}

	function lastUsedLabel(lastUsedAt: string | null): string {
		if (!lastUsedAt) return m.quiet_dusty_hare_idle();
		return new Date(lastUsedAt).toLocaleDateString();
	}

	/** Show just the domain (without a leading www.) for the app URL badge. */
	function appDomain(uri: string): string {
		try {
			return new URL(uri).hostname.replace(/^www\./, '');
		} catch {
			return uri;
		}
	}
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
	<Heading
		title={m.proud_jolly_otter_govern()}
		description={m.swift_lunar_bison_relay()}
		level="h1"
	/>

	<div class="mt-4 mb-8">
		<Button onclick={openAddModal} text={m.merry_brisk_heron_forge()} />
	</div>

	{#if data.apps.length === 0}
		<EmptyStateZone description={m.mellow_calm_dove_void()} />
	{:else}
		<ul class="flex flex-col gap-4">
			{#each data.apps as app (app.id)}
				<Card maxWidth="max-w-3xl">
					<div class="flex items-start gap-4">
						<div class="grow">
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-lg font-bold text-gray-900 dark:text-white">
									{app.clientName}
								</span>
								{#if app.disabledAt}
									<Badge variant="danger" text={m.faint_rusty_crab_flag()} />
								{/if}
							</div>

							{#if app.clientUri}
								<div class="mt-1">
									<Badge
										variant="info"
										href={app.clientUri}
										text={appDomain(app.clientUri)}
										newTabLabel={m.wispy_pale_tern_open()}
									/>
								</div>
							{/if}

							<div class="mt-2 flex flex-wrap gap-2">
								{#each app.scopes as scope (scope)}
									<Badge text={scopeLabel(scope)} />
								{/each}
							</div>

							<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
								{m.cozy_brave_wren_note()}: {new Date(app.createdAt).toLocaleDateString()}
							</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{m.lucid_swift_pike_trace()}: {lastUsedLabel(app.lastUsedAt)}
							</p>
						</div>

						<div class="flex shrink-0 flex-col gap-2">
							{#if !app.disabledAt}
								<Button
									submodule="primary"
									text={m.sharp_bold_fox_stop()}
									onclick={() =>
										(confirmTarget = { id: app.id, name: app.clientName, action: 'disable' })}
								/>
							{/if}
							<Button
								submodule="secondary"
								text={m.dark_rapid_stoat_erase()}
								onclick={() =>
									(confirmTarget = { id: app.id, name: app.clientName, action: 'delete' })}
							/>
						</div>
					</div>
				</Card>
			{/each}
		</ul>
	{/if}
</div>

<!-- Add-app modal: the create form, then an in-modal one-time secret reveal. -->
<Modal
	visible={showAddModal}
	id="add-app-modal"
	title={m.merry_brisk_heron_forge()}
	actions={[]}
	onclose={closeAddModal}
>
	{#if justCreated}
		<div
			class="border border-green-300 bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-200 p-4 rounded-lg"
			role="status"
		>
			<p class="text-sm font-medium">{m.noble_fuzzy_stork_guard()}</p>
			<dl class="mt-3 space-y-2 text-sm">
				<div>
					<dt class="font-semibold">{m.plain_sunny_vole_mark()}</dt>
					<dd class="font-mono break-all select-all">{justCreated.clientId}</dd>
				</div>
				<div>
					<dt class="font-semibold">{m.dusky_witty_moth_hide()}</dt>
					<dd class="font-mono break-all select-all">{justCreated.clientSecret}</dd>
				</div>
			</dl>
		</div>
		<div class="mt-4 flex justify-end">
			<Button submodule="primary" text={m.bright_eager_pika_close()} onclick={closeAddModal} />
		</div>
	{:else}
		<form
			method="POST"
			action="?/create"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success' && result.data?.created) {
						justCreated = result.data.created as { clientId: string; clientSecret: string };
					}
					await update({ reset: false });
				}}
		>
			<div class="mb-4">
				<FormFieldLabel for="clientName" text={m.tidy_gentle_lark_label()} />
				<input id="clientName" name="clientName" type="text" required class={inputClass} />
			</div>

			<div class="mb-4">
				<FormFieldLabel for="clientUri" text={m.keen_amber_seal_point()} />
				<input id="clientUri" name="clientUri" type="url" class={inputClass} />
			</div>

			<fieldset class="mb-4">
				<legend class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
					{m.bold_misty_crane_grant()}
				</legend>
				<div class="space-y-2">
					{#each data.supportedScopes as s (s.scope)}
						<label class="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
							<input type="checkbox" name="scopes" value={s.scope} disabled={!s.enforced} />
							<span class={s.enforced ? '' : 'text-gray-400 dark:text-gray-600'}>
								{scopeLabel(s.scope)}
							</span>
							{#if !s.enforced}
								<span class="text-xs text-gray-400 dark:text-gray-600">
									({m.dim_foggy_slug_wait()})
								</span>
							{/if}
						</label>
					{/each}
				</div>
			</fieldset>

			{#if createError}
				<p class="mb-3 text-sm text-red-600 dark:text-red-500">{createError}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<Button submodule="secondary" text={m.calm_brave_ibis_halt()} onclick={closeAddModal} />
				<Button buttonType="submit" submodule="primary" text={m.crisp_jade_robin_save()} />
			</div>
		</form>
	{/if}
</Modal>

<!-- Confirmation modal shared by Disable and Delete. -->
<Modal
	visible={!!confirmTarget}
	id="confirm-app-action-modal"
	title={confirmTitle}
	actions={[]}
	onclose={() => (confirmTarget = null)}
>
	{#if confirmTarget}
		<p class="text-sm text-gray-700 dark:text-gray-300">
			{confirmTarget.action === 'delete' ? m.murky_lone_shark_burn() : m.plush_warm_dove_calm()}
		</p>
		<form
			method="POST"
			action={`?/${confirmTarget.action}`}
			use:enhance={() =>
				async ({ update }) => {
					await update();
					confirmTarget = null;
				}}
		>
			<input type="hidden" name="clientInternalId" value={confirmTarget.id} />
			<div class="mt-4 flex justify-end gap-2">
				<Button
					submodule="secondary"
					text={m.calm_brave_ibis_halt()}
					onclick={() => (confirmTarget = null)}
				/>
				<Button
					buttonType="submit"
					submodule={confirmTarget.action === 'delete' ? 'danger' : 'primary'}
					text={confirmTarget.action === 'delete'
						? m.dark_rapid_stoat_erase()
						: m.sharp_bold_fox_stop()}
				/>
			</div>
		</form>
	{/if}
</Modal>
