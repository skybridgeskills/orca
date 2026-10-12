<script lang="ts">
	import AchievementIcon from '$lib/components/achievement/AchievementIcon.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import * as m from '$lib/i18n/messages';
	import type { DurableSkill } from '$lib/skills/library';

	import { deserialize } from '$app/forms';

	let { data }: { data: { skills: DurableSkill[]; existingNames: string[] } } = $props();

	type AddState = 'idle' | 'adding' | 'added' | 'error';

	// Names already created in this org (lower-cased), reactive to `data`. A skill whose
	// label matches is shown done + disabled to prevent accidental duplicate competencies.
	const existingNames = $derived(new Set(data.existingNames));
	// Per-skill action state, keyed by skill.key. Only set when the admin acts; the
	// effective state falls back to `existingNames` (see `statusOf`).
	let overrides = $state<Record<string, AddState>>({});
	let query = $state('');

	function statusOf(skill: DurableSkill): AddState {
		return (
			overrides[skill.key] ??
			(existingNames.has(skill.label.trim().toLowerCase()) ? 'added' : 'idle')
		);
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data.skills;
		return data.skills.filter(
			(s) =>
				s.label.toLowerCase().includes(q) ||
				s.statement.toLowerCase().includes(q) ||
				s.key.toLowerCase().includes(q)
		);
	});

	// Create one competency via the existing create action (reused, not duplicated).
	// Field names match the P2 create action: name, description, achievementType, and the
	// rubrics wire format `resultDescription[0].name` + `resultDescription[0].allowedValue[j]`.
	async function addSkill(skill: DurableSkill) {
		const current = statusOf(skill);
		if (current === 'adding' || current === 'added') return;
		overrides[skill.key] = 'adding';

		const formData = new FormData();
		formData.append('name', skill.label);
		formData.append('description', skill.statement);
		formData.append('achievementType', 'Competency');
		formData.append('claimable', 'off');
		formData.append('resultDescription[0].name', skill.label);
		skill.levels.forEach((level, j) => {
			formData.append(`resultDescription[0].allowedValue[${j}]`, level);
		});

		try {
			const response = await fetch('/achievements/create', { method: 'POST', body: formData });
			if (response.status === 200) {
				const result = deserialize(await response.text());
				overrides[skill.key] = result?.type === 'success' ? 'added' : 'error';
			} else {
				overrides[skill.key] = 'error';
			}
		} catch {
			overrides[skill.key] = 'error';
		}
	}
</script>

<Heading title={m.plump_brisk_heron_gather()} description={m.mellow_keen_otter_seed()} />

<div class="my-6 max-w-md">
	<label for="skill-search" class="sr-only">{m.swift_plain_finch_seek()}</label>
	<input
		id="skill-search"
		type="search"
		bind:value={query}
		placeholder={m.swift_plain_finch_seek()}
		class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
	/>
</div>

{#if !filtered.length}
	<p class="text-sm text-gray-500 dark:text-gray-400">{m.dim_soft_moth_empty()}</p>
{:else}
	<div class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
		{#each filtered as skill (skill.key)}
			<Card maxWidth="">
				<div class="flex gap-3">
					<div class="text-blue-600 dark:text-blue-400 shrink-0">
						<AchievementIcon
							achievementType="Competency"
							name={skill.label}
							class="block w-12 h-12"
						/>
					</div>
					<div class="min-w-0 grow">
						<h3 class="font-bold text-gray-900 dark:text-white">{skill.label}</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{skill.statement}</p>
						<div class="mt-2 flex flex-wrap gap-1" aria-label={m.keen_warm_seal_levels()}>
							{#each skill.levels as level (level)}
								<span
									class="whitespace-nowrap rounded-lg py-0.5 px-2 text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
								>
									{level}
								</span>
							{/each}
						</div>
					</div>
				</div>
				{@const state = statusOf(skill)}
				<div class="mt-4 flex items-center">
					{#if state === 'added'}
						<Button text={m.glad_neat_robin_done()} submodule="secondary" disabled={true} />
					{:else if state === 'adding'}
						<Button text={m.calm_eager_wren_load()} disabled={true} />
					{:else}
						<Button
							text={state === 'error' ? m.tart_bold_crow_retry() : m.brisk_warm_lark_add()}
							submodule={state === 'error' ? 'danger' : 'primary'}
							onclick={() => addSkill(skill)}
						/>
					{/if}
				</div>
			</Card>
		{/each}
	</div>
{/if}
