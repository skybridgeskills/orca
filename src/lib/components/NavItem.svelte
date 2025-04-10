<script lang="ts">
  import { page } from "$app/state";

  interface Props {
    href: string;
    title: string;
    class?: string;
    onclick?: (event: MouseEvent | KeyboardEvent) => void;
  }

  let { href, title, class: klass = "", onclick = () => {} }: Props = $props();
</script>

{#if page.url.pathname == href}
  <li class={klass}>
    <a
      {href}
      {onclick}
      onkeypress={onclick}
      class="block py-2 pr-4 pl-3 leading-8 bg-transparent rounded text-blue-700 md:p-0 dark:text-white"
      aria-current="page">{title}</a
    >
  </li>
{:else}
  <li class={klass}>
    <a
      {onclick}
      onkeypress={onclick}
      {href}
      class="block py-2 pr-4 pl-3 leading-8 text-gray-700 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent"
      >{title}</a
    >
  </li>
{/if}

<style>
  .icon-wrap {
    max-height: 0.8em;
  }
</style>
