<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import Button from '$lib/components/Button.svelte';
	import ButtonGroup from '$lib/components/ButtonGroup.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import type { ActionData, PageData } from './$types';
	export let data: PageData;
	const noErrors: { [key: string]: string | null } = {
		givenName: null,
		familyName: null,
		identifierVisibility: null,
		defaultVisibility: null
	};
	let errors = { ...noErrors };
	let formData = {
		givenName: data.session?.user?.givenName ?? '',
		familyName: data.session?.user?.familyName ?? '',
		identifierVisibility:
			data.session?.user?.identifiers.find((a) => true)?.visibility ?? 'COMMUNITY',
		defaultVisibility: data.session?.user?.defaultVisibility ?? 'COMMUNITY'
	};
</script>

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">
	User Settings for {data.session?.user?.givenName}
	{data.session?.user?.familyName}
</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
	{m.home_vivid_mole_gaze()}
</p>

<form method="POST" class="max-w-2xl">
	<div class="mb-6" class:isError={errors.givenName}>
		<label
			for="settings_givenName"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
			>{m.bright_swift_eagle_given()}</label
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
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
			>{m.calm_steady_lynx_family()}</label
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
	<div class="overflow-x-auto relative my-6">
		<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
			<thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
				<tr>
					<th scope="col" class="py-3 px-6"> {m.nice_active_giraffe_propel()} </th>
					<th scope="col" class="py-3 px-6"> {m.warm_male_thrush_pout()} </th>
					<th scope="col" class="py-3 px-6"> {m.clear_crazy_meerkat_nurture()} </th>
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
							<option value="PUBLIC">{m.short_deft_lemur_clasp()}</option>
							<option value="COMMUNITY">{m.equal_small_dolphin_spur()}</option>
							<option value="PRIVATE">{m.pink_last_marten_grin()}</option>
						</select>
					</td>
				</tr>
			{/each}
		</table>
	</div>
	<div>
		<Heading level="h3" title="Badges and Credentials">
			{m.best_sweet_termite_work()}
		</Heading>
		<div class="mb-6" class:isError={errors.givenName}>
			<label
				for="settings_defaultVisibility"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
				>{m.direct_plane_boar_succeed()}</label
			>
			<select
				id="settings_defaultVisibility"
				name="defaultVisibility"
				bind:value={formData.defaultVisibility}
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			>
				<option value="PUBLIC">{m.short_deft_lemur_clasp()}</option>
				<option value="COMMUNITY">{m.equal_small_dolphin_spur()}</option>
				<option value="PRIVATE">{m.pink_last_marten_grin()}</option>
			</select>
			{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.name}</p>{/if}
		</div>

		<Button buttonType="submit" submodule="primary">{m.quick_safe_deer_save()}</Button>
	</div>
</form>
