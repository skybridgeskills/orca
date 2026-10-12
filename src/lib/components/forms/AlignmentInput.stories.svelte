<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';

	import { StoryPreview } from '$lib/storybook';

	import AlignmentInput from './AlignmentInput.svelte';

	const { Story } = defineMeta({
		title: 'components/forms/AlignmentInput',
		component: AlignmentInput
	});

	const onRemove = fn().mockName('onRemove');
</script>

<script lang="ts">
	import type { Alignment } from '$lib/data/alignment';

	let alignment = $state<Alignment>({
		targetUrl: 'https://example.com/framework/skill-123',
		targetName: 'Critical Thinking',
		targetDescription: 'The ability to analyze and evaluate an issue.',
		targetCode: 'CT-123'
	});

	let emptyAlignment = $state<Alignment>({
		targetUrl: '',
		targetName: '',
		targetDescription: '',
		targetCode: ''
	});
</script>

<Story name="Default" asChild>
	<StoryPreview>
		<div class="max-w-xl">
			<AlignmentInput bind:alignment index={0} {onRemove} />
		</div>
	</StoryPreview>
</Story>

<Story name="Empty" asChild>
	<StoryPreview>
		<div class="max-w-xl">
			<AlignmentInput bind:alignment={emptyAlignment} index={1} {onRemove} />
		</div>
	</StoryPreview>
</Story>
