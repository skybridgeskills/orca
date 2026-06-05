<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';

	import { StoryPreview } from '$lib/storybook';

	import Pagination from './Pagination.svelte';

	const { Story } = defineMeta({
		title: 'components/Pagination',
		component: Pagination
	});

	const action = fn().mockName('action');
</script>

<Story name="Pagination" asChild>
	<StoryPreview widths={[320, 768]}>
		<div class="space-y-4">
			<Pagination paging={{ count: 95, page: 3, pageSize: 10, action }} />
			<Pagination paging={{ count: 95, page: 1, pageSize: 10, action }} />
			<Pagination paging={{ count: 95, page: 10, pageSize: 10, action }} />
			<!-- Single page: count <= pageSize → renders nothing (hidden). -->
			<Pagination paging={{ count: 4, page: 1, pageSize: 10, action }} />
		</div>
	</StoryPreview>
</Story>
