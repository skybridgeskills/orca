<script lang="ts">
	import { marked } from 'marked';
	import stripTags from '$lib/utils/stripTags';

	interface Props {
		value?: string;
	}

	let { value = '' }: Props = $props();
</script>

<!-- We are stripping tags, so XSS warning may be dismissed -->
<!-- eslint-disable svelte/no-at-html-tags -->
<div class="markdown-preview">{@html marked(stripTags(value))}</div>
