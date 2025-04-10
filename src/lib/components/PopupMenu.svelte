<script lang="ts">
  import { createPopper, type Instance } from "@popperjs/core";
  import { onMount, type Snippet } from "svelte";
  interface Props {
    open: boolean;
    menuId: string;
    buttonId: string;
    baseClass?: string;
    children?: Snippet;
  }

  let {
    open,
    menuId,
    buttonId,
    baseClass = "z-10 font-normal bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700 dark:divide-gray-600",
    children,
  }: Props = $props();
  let popperInstance: Instance | null = null;

  onMount(() => {
    const button = document.getElementById(buttonId);
    const menu = document.getElementById(menuId);
    if (!button || !menu) return;

    popperInstance = createPopper(button, menu, {
      placement: "bottom-start",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 8],
          },
        },
      ],
    });
  });

  $effect(() => {
    // Whenever open is turned on, we update popper position
    if (open) {
      popperInstance.update();
    }
  });
</script>

<div id={menuId} class={baseClass} class:hidden={!open}>
  {@render children?.()}
</div>
