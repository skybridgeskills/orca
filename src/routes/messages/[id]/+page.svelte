<script lang="ts">
	import dayjs from 'dayjs';

	import Badge from '$lib/components/Badge.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Button from '$lib/components/Button.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import ReportedContentView from '$lib/components/moderation/ReportedContentView.svelte';
	import * as m from '$lib/i18n/messages';

	import type { ActionData, PageData } from './$types';

	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const breadcrumbItems = [
		{ text: m.plain_calm_otter_inbox(), href: '/messages' },
		{ text: m.plain_calm_otter_detail() }
	];

	function reporterStatusLabel(status: string): string {
		switch (status) {
			case 'ANONYMOUS':
				return m.plain_calm_otter_status_anonymous();
			case 'USER':
				return m.plain_calm_otter_status_user();
			case 'MEMBER':
				return m.plain_calm_otter_status_member();
			case 'ADMIN':
				return m.plain_calm_otter_status_admin();
			default:
				return status;
		}
	}
</script>

<Breadcrumbs items={breadcrumbItems} />

<Heading title={m.plain_calm_otter_detail()} level="h1" />

{#if !data.report}
	<p class="text-sm text-gray-500 dark:text-gray-400">{m.plain_calm_otter_nonreport()}</p>
{:else}
	<div class="space-y-6">
		<!-- Report metadata -->
		<section class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
			<div class="flex items-center gap-2 flex-wrap">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
					{m.plain_calm_otter_msg_reported()}
				</h2>
				{#if data.report.isCrossOrg}
					<Badge text={m.plain_calm_otter_cross_org()} variant="info" />
				{/if}
			</div>

			<div>
				<p class="text-xs uppercase tracking-wide text-gray-400">
					{m.plain_calm_otter_reason()}
				</p>
				<p class="text-sm text-gray-900 dark:text-white">{data.report.reason}</p>
			</div>

			{#if data.report.description}
				<div>
					<p class="text-xs uppercase tracking-wide text-gray-400">
						{m.plain_calm_otter_description()}
					</p>
					<p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
						{data.report.description}
					</p>
				</div>
			{/if}

			<!-- Reporter STATUS chip is always shown. -->
			<div class="flex items-center gap-2">
				<span class="text-xs uppercase tracking-wide text-gray-400"
					>{m.plain_calm_otter_reporter_status()}</span
				>
				<Badge text={reporterStatusLabel(data.report.reporterStatus)} />
			</div>

			<!-- Reporter IDENTITY block: superadmin viewers only. The server gates this;
			     the template only renders what was returned. -->
			{#if data.viewerIsSuperadmin && data.reporterIdentity}
				<div class="flex items-center gap-2">
					<span class="text-xs uppercase tracking-wide text-gray-400"
						>{m.plain_calm_otter_reporter_identity()}</span
					>
					<span class="text-sm text-gray-900 dark:text-white"
						>{data.reporterIdentity.name ?? data.reporterIdentity.id}</span
					>
				</div>
			{/if}

			<p class="text-xs text-gray-400">{dayjs(data.report.createdAt).format('lll')}</p>
		</section>

		<!-- Reported content (read-only) -->
		<section>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
				{m.plain_calm_otter_target_heading()}
			</h2>
			{#if data.target}
				<ReportedContentView target={data.target} />
			{/if}
		</section>

		<!-- Current suspension state -->
		<section class="flex items-center gap-2 flex-wrap">
			{#if data.suspension}
				{#if data.suspension.tier === 'SITE'}
					<Badge text={m.plain_calm_otter_suspended_site()} variant="danger" />
				{:else}
					<Badge text={m.plain_calm_otter_suspended_org()} variant="danger" />
				{/if}
				<span class="text-xs text-gray-400">
					{m.dim_quiet_heron_mark({ when: dayjs(data.suspension.createdAt).format('lll') })}
				</span>
			{:else}
				<Badge text={m.plain_calm_otter_not_suspended()} />
			{/if}
		</section>

		<!-- P5: suspend / lift actions -->
		<section class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
			<p class="text-xs uppercase tracking-wide text-gray-400">
				{m.plain_calm_otter_actions()}
			</p>

			{#if form?.message}
				<p class="text-sm text-red-600 dark:text-red-400">{form.message}</p>
			{/if}

			{#if !data.suspension}
				<!-- Not suspended: offer Suspend (tier reflects the viewer's authority). -->
				<form method="POST" action="?/suspend" use:enhance class="space-y-2">
					<label class="block">
						<span class="text-xs uppercase tracking-wide text-gray-400"
							>{m.plain_calm_vole_label()}</span
						>
						<textarea
							name="reason"
							rows="2"
							class="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm p-2"
							placeholder={m.soft_warm_finch_prompt()}
						></textarea>
					</label>
					<Button
						buttonType="submit"
						submodule="danger"
						text={data.viewerActorTier === 'SITE'
							? m.bold_grave_hawk_halt()
							: m.firm_plain_owl_halt()}
					/>
				</form>
			{:else if data.viewerCanLift}
				<!-- Suspended and the viewer outranks-or-equals the suspension tier: Lift. -->
				<form method="POST" action="?/lift" use:enhance>
					<Button buttonType="submit" text={m.bright_keen_crane_lift()} />
				</form>
			{:else}
				<!-- Org admin facing a SITE suspension: server rejects a lift; explain why. -->
				<p class="text-sm text-gray-600 dark:text-gray-300">
					{m.stern_grave_walrus_warn()}
				</p>
			{/if}
		</section>
	</div>
{/if}
