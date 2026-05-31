<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import Pagination from './Pagination.svelte';

	const { Story } = defineMeta({
		title: 'components/Pagination',
		component: Pagination,
		tags: ['autodocs']
	});

	const noop = () => {};
</script>

<Story name="Middle page">
	<div class="p-4">
		<Pagination paging={{ count: 95, page: 3, pageSize: 10, action: noop }} />
	</div>
</Story>

<Story name="First page">
	<div class="p-4">
		<Pagination paging={{ count: 95, page: 1, pageSize: 10, action: noop }} />
	</div>
</Story>

<Story name="Last page">
	<div class="p-4">
		<Pagination paging={{ count: 95, page: 10, pageSize: 10, action: noop }} />
	</div>
</Story>

<Story name="Single page (hidden)">
	<div class="p-4">
		<Pagination paging={{ count: 4, page: 1, pageSize: 10, action: noop }} />
	</div>
</Story>
