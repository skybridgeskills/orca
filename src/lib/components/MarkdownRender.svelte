<script lang="ts">
  import { marked } from "marked";
  import stripTags from "$lib/utils/stripTags";

  export let value = "";
</script>

<div class="markdown-preview">
  <!-- eslint-disable svelte/no-at-html-tags -->{@html marked(stripTags(value))}
</div>
