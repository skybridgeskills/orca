<script lang="ts">
  import * as m from "$lib/i18n/messages";
  import { imageUrl } from "$lib/utils/imageUrl";
  import { page } from "$app/stores";
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import QRCode from "$lib/components/QRCode.svelte";
  import Tag from "$lib/components/Tag.svelte";
  import { calculatePageAndSize } from "$lib/utils/pagination";
  import type { PageData } from "./$types";
  import { PUBLIC_HTTP_PROTOCOL } from "$env/static/public";

  import Card from "$lib/components/Card.svelte";
  import Ribbon from "$lib/illustrations/Ribbon.svelte";
  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let member = data.member;
  let showShareModal = $state(false);
</script>

<div class="max-w-2xl flex justify-between items-center mb-4">
  <h1 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
    {member.givenName}
    {member.familyName}
    {#if member.orgRole}
      <Tag>{m.adminRoleLabel()}</Tag>
    {/if}
  </h1>
  <div class="inline-flex items-center">
    {#if member.id == data.session?.user?.id}
      <Button
        text={m.share()}
        submodule="secondary"
        on:click={() => {
          showShareModal = true;
        }}
      />
      <Button
        href={`/settings`}
        submodule="secondary"
        text={m.profile_editCTA()}
      />
    {/if}
  </div>
</div>
<p class="mt-1 mb-8 text-sm text-gray-500 dark:text-gray-400">
  {#if member.id == data.session?.user?.id}
    {m.member_yourProfileGreeting()}
  {:else}
    {m.member_otherUserProfileDescription()}
  {/if}
</p>

{#if member.identifiers.length}
  <h3 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
    {#if member.identifiers.length == 1}
      1 {m.identifierListLabel()}
    {:else}
      {member.identifiers.length} {m.identifierListLabel_other()}
    {/if}
  </h3>
  {#each member.identifiers as identifier}
    <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
      {identifier.type}: {identifier.identifier}
      {#if identifier.verifiedAt}({m.status_verified()}){/if}
    </p>
  {/each}
{/if}

{#if member._count.receivedAchievementClaims}
  <h3 class="text-2xl sm:text-3xl font-bold mb-4 dark:text-white">
    {member._count.receivedAchievementClaims}
    {member._count.receivedAchievementClaims == 1
      ? m.badge_one()
      : m.badge_other()}
  </h3>
  <Pagination
    paging={{
      ...calculatePageAndSize($page.url),
      count: member._count.receivedAchievementClaims,
    }}
  />

  <div class="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-4">
    {#each member.receivedAchievementClaims as claim}
      <Card maxWidth="" hoverEffect={true} href="/claims/{claim.id}">
        <div class="grid grid-cols-4 gap-2">
          <div class="m-auto">
            {#if claim.achievement.image}
              <img
                src={imageUrl(claim.achievement.image)}
                alt={m.dull_bright_ostrich_delight({
                  achievementName: claim.achievement.name,
                })}
                aria-hidden="true"
              />
            {:else}
              <div class="text-gray-400 dark:text-gray-700">
                <Ribbon />
              </div>
            {/if}
          </div>

          <div class="col-span-3">
            <h3
              class="mb-2 text-base font-bold tracking-tight text-gray-900 dark:text-white"
            >
              {claim.achievement.name}
            </h3>

            <p
              class="mb-3 text-xs font-normal text-gray-700 dark:text-gray-400"
            >
              {m.status_created()}: {claim.createdOn}
            </p>
          </div>
        </div>
      </Card>
    {/each}
  </div>
{/if}

{#if member.id == data.session?.user?.id}
  <Modal
    visible={showShareModal}
    title={m.share()}
    onclose={() => {
      showShareModal = false;
    }}
    actions={[
      {
        label: m.share_copyUrl(),
        buttonType: "button",
        submodule: "secondary",
        onClick: (e) => {
          if (!member || !navigator.clipboard) {
            return;
          }
          const url = `${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/members/${member.id}`;
          navigator.clipboard.writeText(url);
          console.log(m.claim_shareUrlCopied() + url);
          e?.preventDefault();
          e?.stopPropagation();
        },
      },
    ]}
  >
    <p class="text-sm text-gray-500 dark:text-gray-400">
      {m.member_share_description()}
    </p>
    <QRCode
      url={`${PUBLIC_HTTP_PROTOCOL}://${data.org.domain}/members/${member.id}`}
      alt={m.share_qrCodeImageAltText()}
    />
  </Modal>
{/if}
