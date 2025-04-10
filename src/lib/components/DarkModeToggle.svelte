<script lang="ts">
  import * as m from "$lib/i18n/messages";
  import Icon from "svelte-icons-pack/Icon.svelte";
  import WiNightClear from "svelte-icons-pack/wi/WiNightClear.js";
  import WiHorizonAlt from "svelte-icons-pack/wi/WiHorizonAlt.js";
  import { preferredTheme } from "../stores/interfacePrefsStore";
</script>

<button
  id="darkmode-toggle"
  type="button"
  class="ml-2 y-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 rounded-lg text-sm"
  onclick={preferredTheme.toggleDarkMode}
>
  {#if $preferredTheme == "light"}
    <div class="icon text-gray-500">
      <Icon src={WiHorizonAlt} size="32" color="currentColor" />
    </div>
  {:else}
    <div class="icon text-gray-500">
      <Icon src={WiNightClear} size="32" color="currentColor" />
    </div>
  {/if}
  <span class="sr-only">{m.themeCTA_description()}</span>
</button>

<style>
  .icon {
    width: 32px;
    height: 32px;
  }
</style>
