<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import RadioOption from './RadioOption.svelte';

	const { Story } = defineMeta({
		title: 'components/forms/RadioOption',
		component: RadioOption
	});
</script>

<script lang="ts">
	let selected = $state('email');
</script>

<Story name="RadioOption" asChild>
	<StoryPreview>
		<div class="space-y-4">
			<div class="space-y-2">
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

			<RadioOption
				selectedOption="email"
				value="email"
				name="contact_disabled"
				id="contact-disabled"
				label="Disabled option"
				disabled
			/>

			<RadioOption selectedOption="badge" value="badge" name="config" id="config-badge">
				Require a <strong>badge</strong>
			</RadioOption>
		</div>
	</StoryPreview>
</Story>
