<script lang="ts">
  import RightArrow from "$lib/illustrations/RightArrow.svelte";
  import { createEventDispatcher } from "svelte";

  interface Props {
    class?: string;
    text?: string;
    href?: string;
    id?: string;
    disabled?: boolean;
    buttonType?: "button" | "submit";
    moreProps?: Object;
    onclick?: () => void;
    submodule?: App.ButtonRole;
    children?: import("svelte").Snippet;
  }

  let {
    class: klass = "",
    text = "",
    href = "",
    id = "",
    disabled = false,
    buttonType = "button",
    moreProps = {},
    onclick = () => {},
    submodule = "primary",
    children,
  }: Props = $props();

  const dispatch = createEventDispatcher();

  let defaultClasses = `flex items-center mr-3 focus:outline-none focus:ring-4 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center ${klass}`;
  const submoduleClassList = {
    primary: `${defaultClasses} text-white bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:ring-blue-300 dark:focus:ring-blue-800`,
    secondary: `${defaultClasses} bg-white text-gray-600 border dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 focus:ring-blue-300 dark:focus:ring-blue-800`,
    danger: `${defaultClasses} text-white bg-red-600 border-red-900 focus:ring-red-300 dark:focus:ring-red-700`,
  };
  const disabledClassList = {
    primary: `${defaultClasses} bg-blue-400 dark:bg-blue-500 cursor-not-allowed`,
    secondary: `${defaultClasses} text-gray-400 dark:text-gray-600 bg-gray-200 dark:bg-gray-700 cursor-not-allowed`,
    danger: `${defaultClasses} bg-red-400 cursor-not-allowed`,
  };

  const handleClick = () => {
    if (!disabled) {
      onclick();
    }
  };
</script>

{#if href}
  <a
    {id}
    {href}
    {...moreProps}
    class={disabled
      ? disabledClassList[submodule]
      : submoduleClassList[submodule]}
  >
    {#if children}{@render children()}{:else}{text}{/if}
  </a>
{:else}
  <button
    {id}
    type={buttonType}
    {...moreProps}
    onclick={handleClick}
    onkeypress={(e) => {
      if (e.key == "Enter" || e.key == " ") handleClick();
    }}
    class={disabled
      ? disabledClassList[submodule]
      : submoduleClassList[submodule]}
    {disabled}
  >
    {#if children}{@render children()}{:else}{text}{/if}
  </button>
{/if}
