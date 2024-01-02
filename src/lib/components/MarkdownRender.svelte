<script lang="ts">
	import { marked } from 'marked';
	import stripTags from '$lib/utils/stripTags';

	export let value = '';
</script>

<div class="markdown-preview">{@html marked(stripTags(value))}</div>
