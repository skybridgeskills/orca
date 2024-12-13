<script lang="ts">
  import RightArrow from "$lib/illustrations/RightArrow.svelte";
  import { createEventDispatcher } from "svelte";
  let klass = "";
  export { klass as class };
  export let text: string = "";
  export let href: string = "";
  export let id: string = "";
  export let disabled = false;
  export let buttonType: "button" | "submit" = "button";
  export let moreProps: Object = {};
  export let submodule: App.ButtonRole = "primary";

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
      dispatch("click");
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
    <slot>{text}</slot>
  </a>
{:else}
  <button
    {id}
    type={buttonType}
    {...moreProps}
    on:click={handleClick}
    on:keypress={(e) => {
      if (e.key == "Enter" || e.key == " ") handleClick();
    }}
    class={disabled
      ? disabledClassList[submodule]
      : submoduleClassList[submodule]}
    {disabled}
  >
    <slot>{text}</slot>
  </button>
{/if}
