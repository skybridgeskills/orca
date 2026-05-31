<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import RadioOption from './RadioOption.svelte';

	const { Story } = defineMeta({
		title: 'components/forms/RadioOption',
		component: RadioOption,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let selected = $state('email');
</script>

<Story name="Group">
	<div class="p-4 space-y-2">
		<RadioOption
			bind:selectedOption={selected}
			value="email"
			name="contact"
			id="contact-email"
			label="Email"
		/>
		<RadioOption
			bind:selectedOption={selected}
			value="sms"
			name="contact"
			id="contact-sms"
			label="SMS"
		/>
		<RadioOption
			bind:selectedOption={selected}
			value="none"
			name="contact"
			id="contact-none"
			label="Do not contact"
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400">Selected: {selected}</p>
	</div>
</Story>

<Story name="Disabled">
	<div class="p-4">
		<RadioOption
			selectedOption="email"
			value="email"
			name="contact_disabled"
			id="contact-disabled"
			label="Email"
			disabled
		/>
	</div>
</Story>

<Story name="With children">
	<div class="p-4">
		<RadioOption selectedOption="badge" value="badge" name="config" id="config-badge">
			Require a <strong>badge</strong>
		</RadioOption>
	</div>
</Story>
