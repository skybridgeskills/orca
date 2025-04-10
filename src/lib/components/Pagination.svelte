<script lang="ts">
  import { preventDefault } from "svelte/legacy";

  import * as m from "$lib/i18n/messages";
  import {
    MAX_PAGE_SIZE,
    PAGE_QUERY_PARAM,
    PAGE_SIZE_QUERY_PARAM,
  } from "$lib/utils/pagination";
  import Button from "./Button.svelte";
  import Icon from "svelte-icons-pack";
  import FiChevronLeft from "svelte-icons-pack/fi/FiChevronLeft.js";
  import FiChevronRight from "svelte-icons-pack/fi/FiChevronRight.js";

  interface Props {
    paging: {
      count: number;
      page: number;
      pageSize: number;
      action?: (p: number) => Promise<void> | void;
    };
  }

  let { paging }: Props = $props();
  let { count, page, pageSize } = $derived(paging);
  let maxPage = $derived(Math.ceil(count / pageSize));
  let pages = $derived(Array.from({ length: maxPage }, (_, i) => i + 1));

  const defaultPagingAction = (page: number) => {
    const target = `?${PAGE_QUERY_PARAM}=${page}`;

    window.location.href =
      pageSize != MAX_PAGE_SIZE
        ? `${target}&${PAGE_SIZE_QUERY_PARAM}=${pageSize}`
        : target;
  };

  const action = paging.action || defaultPagingAction;
</script>

{#if count > 0 && maxPage > 1}
  <div class="text-right my-2">
    <span class="mr-4 text-sm text-gray-500 dark:text-gray-400 inline-block"
      >{m.paginationSummary({ page, maxPage, count })}</span
    >
    <span>
      {#if page > 1 && maxPage > 1}
        <span class="inline-block text-blue-500">
          <Button onclick={() => action(page - 1)} submodule="secondary"
            ><Icon src={FiChevronLeft} size="16" /></Button
          >
        </span>
      {/if}
      {#each pages as p}
        <span class="inline-block text-gray-500 dark:text-gray-400 text-sm">
          {#if p == page}
            <span class="mr-2">{p}</span>
          {:else}
            <button
              class="mr-2 underline hover:no-underline"
              onclick={preventDefault(() => action(p))}>{p}</button
            >
          {/if}
        </span>
      {/each}
      {#if page < maxPage && maxPage > 1}
        <span class="inline-block text-blue-500">
          <Button onclick={() => action(page + 1)} submodule="secondary"
            ><Icon src={FiChevronRight} size="16" /></Button
          >
        </span>
      {/if}
    </span>
  </div>
{/if}
