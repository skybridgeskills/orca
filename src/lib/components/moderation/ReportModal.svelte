<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import * as m from '$lib/i18n/messages';

	/** Mirrors the Prisma `ReportTargetType` enum. */
	type ReportTargetType = 'ACHIEVEMENT' | 'CLAIM' | 'ENDORSEMENT';

	interface Props {
		targetType: ReportTargetType;
		targetId: string;
		/** Bindable open state, controlled by the surrounding surface. */
		open: boolean;
		/** Called after the modal closes (success or cancel). */
		onclose?: () => void;
	}

	let { targetType, targetId, open = $bindable(), onclose }: Props = $props();

	const reasonOptions = [
		{ value: 'SPAM', label: m.sleek_bold_quail_spam() },
		{ value: 'ABUSE', label: m.tense_grim_bison_abuse() },
		{ value: 'INAPPROPRIATE', label: m.vivid_sour_lark_flag() },
		{ value: 'MISINFORMATION', label: m.proud_dim_seal_lie() },
		{ value: 'OTHER', label: m.quiet_odd_crow_other() }
	];

	let reason = $state('');
	let description = $state('');
	let submitting = $state(false);
	let errorMessage = $state('');

	const reset = () => {
		reason = '';
		description = '';
		submitting = false;
		errorMessage = '';
	};

	const close = () => {
		open = false;
		reset();
		onclose?.();
	};

	const submit = async () => {
		if (!reason || submitting) return;
		submitting = true;
		errorMessage = '';

		try {
			const res = await fetch('/api/v1/reports', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetType, targetId, reason, description })
			});

			if (!res.ok) {
				errorMessage = m.cross_tart_mole_fail();
				submitting = false;
				return;
			}

			const body = await res.json();
			if (!body?.ok) {
				errorMessage = m.cross_tart_mole_fail();
				submitting = false;
				return;
			}

			close();
		} catch {
			errorMessage = m.cross_tart_mole_fail();
			submitting = false;
		}
	};
</script>

<Modal
	visible={open}
	title={m.murky_glad_raven_warn()}
	onclose={close}
	actions={[
		{
			label: m.calm_steady_lynx_cancel(),
			buttonType: 'button',
			submodule: 'secondary',
			onClick: close
		},
		{
			label: m.eager_brave_wren_send(),
			buttonType: 'button',
			submodule: 'primary',
			onClick: submit
		}
	]}
>
	<div class="space-y-4">
		<div>
			<label
				for="reportReason"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.plump_eager_finch_label()}</label
			>
			<select
				id="reportReason"
				bind:value={reason}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			>
				<option value="" disabled selected>{m.tidy_fond_vole_pick()}</option>
				{#each reasonOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<div>
			<label
				for="reportDescription"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.swift_pale_moose_note()}</label
			>
			<textarea
				id="reportDescription"
				rows="4"
				bind:value={description}
				placeholder={m.dizzy_warm_stoat_hint()}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			></textarea>
		</div>

		{#if errorMessage}
			<p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
		{/if}
	</div>
</Modal>
