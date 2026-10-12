<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import StatusTag from './StatusTag.svelte';

	const { Story } = defineMeta({
		title: 'components/StatusTag',
		component: StatusTag
	});

	const past = new Date('2020-01-01');
</script>

<Story name="StatusTag" asChild>
	<StoryPreview>
		<div class="space-y-3">
			<StatusTag status="ACCEPTED" validFrom={past} />
			<StatusTag status="REJECTED" validFrom={past} />
			<StatusTag status="UNACCEPTED" validFrom={past} />
			<StatusTag status="ACCEPTED" />
		</div>
	</StoryPreview>
</Story>
