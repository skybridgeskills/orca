# Composable claim-detail component

- Status: Accepted
- Date: 2026-06-09
- Deciders: ORCA maintainers

## Context

The claim detail surface was implemented as four divergent per-status partials
plus inline branching in the route:

- `src/routes/claims/[claimId]/+page.svelte` branched on owner vs non-owner,
  then on claim status, then had a second `{#if !owner}` block for an
  attribution / evidence / status `Alert`, then an endorsements block.
- `src/lib/partials/achievementClaim/{Accepted,Rejected,Unaccepted}ClaimDetail.svelte`
  each re-implemented header + `AchievementSummary` + `ClaimForm` wiring +
  bespoke action buttons, with three different prop contracts.
- `PublicClaimDetail.svelte` was a fourth, separate contract for the public
  route.

The displayed view is really a product of four dimensions:

> claim status × viewer role × allowed actions × visibility affordances

Encoding that product as nested per-status components meant the same affordance
(e.g. "edit claim") was written several times, the three contracts had to be
reconciled at every call site, and the upcoming visibility UI (P4) had no
single place to mount.

## Decision

Introduce one viewer-aware `ClaimDetail.svelte` driven by a derived view-model,
composing small focused children, with a single prop contract for both routes.

- **One prop contract.** `ClaimDetail` takes
  `{ claim, achievement, viewer, exchangeEnabled?, visibility? }`, where
  `achievement` carries its `organization` (+ optional `category` /
  `achievementConfig`). Both the authenticated route and the public route
  normalize their loader data into this shape.
- **Viewer role from P1.** The authenticated loader resolves the role once via
  `viewerRole` (`$lib/server/claimVisibility`) and passes it as `viewer`; the
  public route passes the literal `'public'`. The component never recomputes
  `session.user.id == claim.userId` inline.
- **Actions-as-data.** A pure helper, `claimActions(status, viewer,
exchangeEnabled)` in `$lib/claimViewModel.ts`, returns the allowed action ids
  (`editClaim`, `rejectClaim`, `download`, `sendToWallet`, `exchange`,
  `copyLink`, `shareQr`, `shareLinkedin`) split into a `manage` and a `share`
  list. `ClaimDetail` maps each id to a render descriptor (copy, button role,
  handler/href/download) and renders them through `ClaimActionBar` /
  `ShareActions` rather than hand-written per-status button blocks.
- **Behavior preservation.** The helper returns empty lists for every non-owner
  role, exactly mirroring the pre-refactor UI, where accept / reject / edit /
  download / share were only ever shown to the badge owner. No new exposure was
  introduced (no share/download for non-owners; REJECTED still only reaches
  admins via P2's server authorization; the public route is still
  ACCEPTED+PUBLIC only).
- **Public-route reuse.** `ClaimDetail` keeps a dedicated `viewer === 'public'`
  presentation branch that preserves the previous `PublicClaimDetail` layout
  (the "Earned badge: …" heading, criteria, accepted copy) while reusing the
  shared `AchievementSummary` and `AchievementClaimEvidence` children. This
  removes the fourth contract without changing what the public page renders.
- **Children.** `ClaimHeader` (title + status/viewer-aware lede + a visibility
  region), reuse of existing `AchievementSummary` and `AchievementClaimEvidence`,
  `ClaimActionBar` (renders an array of action descriptors), and `ShareActions`
  (the "Share this badge" bar). Modals/forms (`ClaimForm`,
  `SendToWalletExchangeModal`, send-to-wallet / QR modals) remain, but their
  trigger state lives in `ClaimDetail` and is opened by action handlers.
- **Endorsements stay in the route.** The endorsements heading/list is
  conceptually separate from the claim body and remained in
  `claims/[claimId]/+page.svelte`. The claim-specific non-owner attribution +
  evidence + status `Alert` block moved into `ClaimDetail`.

## P4 seam

`ClaimDetail` accepts a `visibility` snippet prop and forwards it to
`ClaimHeader`, which renders it directly beneath the title. P4 will mount the
owner `VisibilityControl` editor and the authorized-viewer "why visible"
indicator there as a drop-in, with no change to `ClaimDetail`'s layout or prop
contract. P3 leaves the region empty.

## Consequences

- The four per-status partials (`Accepted`, `Rejected`, `Unaccepted`,
  `Public` `ClaimDetail.svelte`) are removed; both routes use `ClaimDetail`.
- Adding/removing an affordance is now a single edit to `claimActions` plus a
  descriptor case, instead of editing multiple partials.
- The owner ACCEPTED claim form still opens in a modal while the UNACCEPTED /
  REJECTED forms render inline, preserving the prior UX; this status-specific
  presentation lives in one component rather than three.
- `ViewerRole` now lives in the client-safe `$lib/claimViewModel.ts` and is
  re-exported from `$lib/server/claimVisibility.ts`, so the browser bundle can
  share the type without importing a `$lib/server` module.

## Copy change

The only copy change permitted by this phase: the hardcoded English
`text="Change acceptance"` button in the old `RejectedClaimDetail` was replaced
with the i18n key `mellow_brisk_otter_amend` in all four language files.
