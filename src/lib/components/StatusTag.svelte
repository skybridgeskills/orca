<script lang="ts">
  import * as m from "$lib/i18n/messages";
  import type { ClaimStatus } from "@prisma/client";

  interface Props {
    status: ClaimStatus;
    validFrom?: Date | null;
    validUntil?: Date | null;
    absolute?: boolean;
  }

  let {
    status,
    validFrom = null,
    validUntil = null,
    absolute = false,
  }: Props = $props();

  let calculatedStatus: ClaimStatus | "UNDER_REVIEW" = $derived(
    (validFrom && !validUntil) ||
      (validFrom && validUntil && new Date() > validUntil)
      ? status
      : "UNDER_REVIEW"
  );

  const statusColor = {
    ACCEPTED: "border-r-lime-500 dark:border-r-lime-600",
    REJECTED: "border-r-red-500 dark:border-r-red-600",
    UNACCEPTED: "border-r-yellow-500 dark:border-r-yellow-600",
    UNDER_REVIEW: "border-r-orange-500 dark:border-r-orange-600",
  };
  const statusText = {
    ACCEPTED: m.status_accepted(),
    REJECTED: m.status_rejected(),
    UNACCEPTED: m.status_invited(),
    UNDER_REVIEW: m.status_underReview(),
  };
</script>

{#if status}
  <div
    class="{absolute
      ? 'absolute top-0 right-0 rounded-tr-lg rounded-bl-lg border-t-0'
      : 'inline-block rounded-lg'} border border-r-4 border-gray-200 dark:border-gray-600 p-1 px-2 bg-white dark:text-gray-300 text-sm dark:bg-gray-700 {statusColor[
      calculatedStatus
    ]}"
  >
    {statusText[calculatedStatus]}
  </div>
{/if}
