<script lang="ts">
  import * as m from "$lib/i18n/messages";
  import { createEventDispatcher } from "svelte";
  import { v4 as uuidv4 } from "uuid";
  interface Props {
    level?: App.NotificationLevel;
    message?: string;
    heading?: string;
    dismissable?: boolean;
    elementId?: string;
    children?: import('svelte').Snippet;
  }

  let {
    level = "info",
    message = "",
    heading = "",
    dismissable = false,
    elementId = uuidv4(),
    children
  }: Props = $props();
  const dispatch = createEventDispatcher();

  const levelClasses = {
    info: "text-blue-700 bg-blue-100 dark:bg-blue-200 dark:text-blue:800",
    warning:
      "text-amber-700 bg-amber-100 dark:bg-amber-200 dark:text-amber-800",
    success:
      "text-green-700 bg-green-100 dark:bg-green-200 dark:text-green-800",
    error: "text-red-700 bg-red-100 dark:bg-red-200 dark:text-red-800",
  };
  const buttonClasses = {
    info: "hover:bg-blue-300",
    warning: "hover:bg-amber-300",
    success: "hover:bg-emerald-300",
    error: "hover:bg-red-300",
  };
</script>

{#if dismissable}
  <div
    class="max-w-2xl flex items-center p-4 mb-4 rounded-lg {levelClasses[
      level
    ]}"
    role="alert"
    id={elementId}
  >
    <div class="ml-3 text-sm font-medium">
      {message}
      {@render children?.()}
    </div>
    <button
      type="button"
      class="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-blue-400 p-1.5 inline-flex items-center justify-center h-8 w-8 {buttonClasses[
        level
      ]}"
      data-dismiss-target={elementId}
      aria-label={m.close()}
      onclick={() => {
        dispatch("close");
      }}
    >
      <span class="sr-only">{m.close()}</span>
      <svg
        class="w-3 h-3"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 14 14"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
        />
      </svg>
    </button>
  </div>
{:else}
  <div
    class="max-w-2xl p-4 my-4 text-sm rounded-lg {levelClasses[level]}"
    role="alert"
  >
    {#if heading}<span class="font-medium">{heading}</span>{/if}
    {message}
    {@render children?.()}
  </div>
{/if}
