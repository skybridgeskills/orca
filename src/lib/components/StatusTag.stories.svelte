<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import StatusTag from './StatusTag.svelte';

	const { Story } = defineMeta({
		title: 'components/StatusTag',
		component: StatusTag,
		tags: ['autodocs']
	});

	const past = new Date('2020-01-01');
</script>

<Story name="Accepted">
	<div class="p-4">
		<StatusTag status="ACCEPTED" validFrom={past} />
	</div>
</Story>

<Story name="Rejected">
	<div class="p-4">
		<StatusTag status="REJECTED" validFrom={past} />
	</div>
</Story>

<Story name="Unaccepted">
	<div class="p-4">
		<StatusTag status="UNACCEPTED" validFrom={past} />
	</div>
</Story>

<Story name="Under review">
	<div class="p-4">
		<StatusTag status="ACCEPTED" />
	</div>
</Story>
