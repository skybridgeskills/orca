<script lang="ts">
	import { Icon } from 'svelte-icons-pack';
	import { FiSearch } from 'svelte-icons-pack/fi';

	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { userLabel, type UserSummary } from '$lib/data/userSummary';
	import * as m from '$lib/i18n/messages';

	interface Props {
		/** The chosen users; the source of truth for the hidden inputs. */
		selected?: UserSummary[];
		/** Name of the hidden inputs, one per chosen user id. */
		inputName?: string;
		inputId?: string;
		/** Modal title. */
		label?: string;
		/** Text of the button that opens the search. */
		addLabel?: string;
		disabled?: boolean;
	}

	let {
		selected = $bindable([]),
		inputName = 'users',
		inputId = 'userMultiSelect',
		label = '',
		addLabel = '',
		disabled = false
	}: Props = $props();

	const SEARCH_DEBOUNCE_MS = 250;

	let modalOpen = $state(false);
	let query = $state('');
	let results = $state<UserSummary[]>([]);
	let totalCount = $state<number | null>(null);
	let status = $state<'idle' | 'loading' | 'done' | 'error'>('idle');

	let controller: AbortController | null = null;
	let debounce: ReturnType<typeof setTimeout> | undefined;

	const selectedIds = $derived(new Set(selected.map((u) => u.id)));

	const tColor = 'text-gray-900 dark:text-gray-300 hover:no-underline';
	const dtColor = 'text-gray-400 dark:text-gray-600';

	async function search(q: string) {
		controller?.abort();
		const current = new AbortController();
		controller = current;
		status = 'loading';
		try {
			const params = new URLSearchParams({ q, includeCount: 'true' });
			const response = await fetch(`/api/v1/users?${params}`, {
				headers: { Accept: 'application/json' },
				signal: current.signal
			});
			if (!response.ok) throw new Error(`users search failed: ${response.status}`);
			const body: { data: UserSummary[]; meta: { totalCount?: number } } = await response.json();
			if (current.signal.aborted) return;
			results = body.data;
			totalCount = body.meta.totalCount ?? null;
			status = 'done';
		} catch {
			if (current.signal.aborted) return;
			results = [];
			totalCount = null;
			status = 'error';
		}
	}

	function openModal() {
		if (disabled) return;
		modalOpen = true;
		search(query);
	}

	function closeModal() {
		clearTimeout(debounce);
		controller?.abort();
		modalOpen = false;
		query = '';
		results = [];
		totalCount = null;
		status = 'idle';
	}

	function onQueryInput() {
		clearTimeout(debounce);
		debounce = setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
	}

	function add(user: UserSummary) {
		if (!selectedIds.has(user.id)) selected = [...selected, user];
	}

	function remove(id: string) {
		selected = selected.filter((u) => u.id !== id);
	}
</script>

{#each selected as user (user.id)}
	<input type="hidden" name={inputName} value={user.id} />
{/each}

{#snippet userText(user: UserSummary)}
	{@const text = userLabel(user)}
	<span class="block text-sm font-medium text-gray-900 dark:text-white">
		{text ?? m.shy_plain_badger_lack()}
	</span>
	{#if user.email && user.email !== text}
		<span class="block text-sm break-all text-gray-500 dark:text-gray-400">{user.email}</span>
	{/if}
{/snippet}

<div id={inputId}>
	{#if selected.length > 0}
		<ul class="mb-3 divide-y divide-gray-200 dark:divide-gray-700">
			{#each selected as user (user.id)}
				<li class="flex items-center justify-between gap-3 py-2">
					<div class="min-w-0">{@render userText(user)}</div>
					<button
						type="button"
						class="text-sm {disabled ? dtColor : tColor} underline"
						onclick={() => remove(user.id)}
						{disabled}
					>
						{m.firm_clear_fox_remove()}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<Button submodule="secondary" onclick={openModal} {disabled}>{addLabel}</Button>
</div>

<Modal id="userMultiSelect_modal" visible={modalOpen} title={label} onclose={closeModal}>
	<div class="relative text-gray-900 dark:text-white">
		<div class="absolute inset-y-0 inset-s-0 flex items-center ps-3 pointer-events-none">
			<Icon src={FiSearch} size="16" color="currentColor" />
		</div>
		<input
			type="text"
			id="userMultiSelect_searchInput"
			aria-label={m.mild_eager_lynx_seek()}
			autocomplete="off"
			class="pl-10 bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder={m.mild_eager_lynx_seek()}
			bind:value={query}
			oninput={onQueryInput}
			onkeydown={(e) => {
				// The picker lives inside the achievement form: Enter must not submit it.
				if (e.key === 'Enter') e.preventDefault();
			}}
		/>
	</div>

	<div aria-live="polite">
		{#if status === 'loading' && results.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">{m.lively_brief_hare_hunt()}</p>
		{:else if status === 'error'}
			<p class="text-sm text-red-600 dark:text-red-500">{m.frail_tense_crow_falter()}</p>
		{:else if status === 'done' && results.length === 0}
			<p class="text-sm text-gray-900 dark:text-gray-300">{m.tidy_quiet_mole_miss()}</p>
		{:else if totalCount !== null && totalCount > results.length}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{m.broad_calm_tern_narrow({ shown: results.length, total: totalCount })}
			</p>
		{/if}
	</div>

	{#if results.length > 0}
		<ul class="divide-y divide-gray-200 dark:divide-gray-700">
			{#each results as user (user.id)}
				<li class="flex items-center justify-between gap-3 py-2">
					<div class="min-w-0">{@render userText(user)}</div>
					<!-- `Button` is full-width below `sm`; keep it at its natural width. -->
					<div class="shrink-0">
						{#if selectedIds.has(user.id)}
							<Button submodule="secondary" disabled={true}>{m.glad_neat_robin_done()}</Button>
						{:else}
							<Button submodule="secondary" onclick={() => add(user)}>
								{m.brisk_warm_lark_add()}
							</Button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
