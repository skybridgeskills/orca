<!-- @migration-ta</script>sk Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script lang="ts">
  import Heading from "$lib/components/Heading.svelte";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    description?: string;
    descriptionSnippet?: Snippet;
    image?: Snippet;
  }
  let { title, description, descriptionSnippet, image }: Props = $props();
</script>

<!--
	Use this component for when there are no objects and the user 
	should be prompted with a call to action to resolve the empty state. 
	Use a link in the 
-->

<div class="bg-white dark:bg-gray-800 p-6 mt-10 max-w-3xl rounded shadow">
  <div class="flex flex-col sm:flex-row gap-4">
    <div class="text-gray-500 w-40 dark:text-white">
      {@render image?.()}
    </div>
    <div>
      {#if !descriptionSnippet}
        <Heading {title} level="h2" {description} />
      {:else}
        <h2 class="text-2xl sm:text-3xl font-bold dark:text-white mb-2">
          {title}
        </h2>
        {@render descriptionSnippet()}
      {/if}
    </div>
  </div>
</div>
