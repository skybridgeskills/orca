<script lang="ts">
  import * as m from "$lib/i18n/messages";
  import type { Snippet } from "svelte";

  interface Item {
    text: string;
    href?: string;
    icon?: string;
    props?: object;
    class?: string;
  }

  interface Props {
    items: Array<Item>;
    divider?: Snippet;
  }

  let { items, divider }: Props = $props();
</script>

<nav class="flex" aria-label={m.breadcrumb()}>
  <ol class="inline-flex items-center space-x-1 md:space-x-3 mb-4">
    {#each items as item, i}
      {#if i !== 0}
        <li class="divider dark:text-gray-400">
          <!-- The slot used for divider -->
          {#if divider}{@render divider()}{:else}/{/if}
        </li>
      {/if}
      <li class="inline-flex items-center">
        {#if item.href}
          <a
            href={item.href}
            class="breadcrumb-item inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white {item.class}"
            {...item.props}
          >
            {item.text}
          </a>
        {:else}
          <span
            class="breadcrumb-item disabled text-sm font-medium text-gray-500 dark:text-gray-400 {item.class}"
            {...item.props}
          >
            {item.text}
          </span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
