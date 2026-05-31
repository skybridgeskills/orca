<script lang="ts">
	import { marked } from 'marked';
	import stripTags from '$lib/utils/stripTags';

	interface Props {
		value?: string;
	}

	let { value = '' }: Props = $props();
</script>

<div class="markdown-preview">{@html marked(stripTags(value))}</div>
