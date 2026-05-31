<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import AlignmentInput from './AlignmentInput.svelte';
	import type { Alignment } from '$lib/data/alignment';

	const { Story } = defineMeta({
		title: 'components/forms/AlignmentInput',
		component: AlignmentInput,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let alignment = $state<Alignment>({
		targetUrl: 'https://example.com/framework/skill-123',
		targetName: 'Critical Thinking',
		targetDescription: 'The ability to analyze and evaluate an issue.',
		targetCode: 'CT-123'
	});
</script>

<Story name="Default">
	<div class="p-4 max-w-xl">
		<AlignmentInput bind:alignment index={0} onRemove={() => {}} />
	</div>
</Story>

<Story name="Empty">
	<div class="p-4 max-w-xl">
		<AlignmentInput
			alignment={{ targetUrl: '', targetName: '', targetDescription: '', targetCode: '' }}
			index={1}
			onRemove={() => {}}
		/>
	</div>
</Story>
