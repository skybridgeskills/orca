# 05 — Invites, awards & reviews

Two earning paths the public open-claim flow does not cover: an **admin awards/invites** the
_Invite-only_ badge to an email (the **_Invitee_** registers and the claim lands), and a
**review flow** turns an initially-invalid _Reviewed_ claim **valid** once a reviewer records
a rubric-scored endorsement (and stewards get notified). Produces the **_Invitee user_** and
a valid reviewed claim with results.

Do the [setup](./00-setup.md) first; run after [04 — Claiming](./04-claiming.md). **Do not
reset the database.**

## Preconditions

- From journey 2: the **_Invite-only_** badge (not publicly claimable; invite/award gated)
  and the **_Reviewed_** badge (a review requirement — admin-review or badge-reviewer — with
  `reviewsRequired = N`, optionally a **rubric** of `ResultDescription`s and/or **stewards**).
- The **_Admin_** account (journey 1) — performs the award/invite and can endorse.
- The **_Member user_** (journey 4) — available as a non-admin endorser if _Reviewed_ uses a
  reviewer badge they hold, or as the reviewed claimant.
- A second email you can read codes for — becomes the **_Invitee user_**.
- For steward notifications: _Reviewed_ should list at least one **steward** (an org member,
  e.g. the _Member user_), set in journey 2. The notification "email" prints to the dev
  console.

## A. Award / invite _Invite-only_ by email — **admin-only** (or invite-capability holder)

Performed by the **_Admin_** (the "Award" button shows only when
`canInviteToAchievement` passes — admins always; a non-admin only when the badge's
`capabilities.inviteRequires` is set **and** they hold that badge).

- [ ] 1. As _Admin_, open **`/achievements/<Invite-only id>`**. Expected: an **"Award"**
     button is shown (admin has invite capability) → it links to
     **`/achievements/<Invite-only id>/award`**.
- [ ] 2. On **`/achievements/<Invite-only id>/award`**, enter the **_Invitee_ email**,
     optional narrative + evidence URL, and submit. Expected: a confirmation renders
     ("invited" copy with the invitee email); an outstanding **invite** (`ClaimEndorsement`
     with `inviteeEmail`, `creatorId = Admin`, `claimId = null`) is created.
- [ ] 3. Confirm the invite appears on the achievement page. As _Admin_ open
     **`/achievements/<Invite-only id>`** → the **ClaimList** "Invites" tab (the
     `ClaimEndorsement` category) lists the _Invitee_ email row. (The Invites tab shows only
     when the viewer has invite capability — `enableInvites`.)
- [ ] 4. **Accept as the _Invitee_** (logged out, a fresh email). The invite link has the
     shape **`/achievements/<id>/claim?i=<inviteId>&e=<inviteeEmail>`** (also surfaced from
     `/login` and `/backpack` when the invitee logs in). Open it. Expected:
     - If the invite is **fresh (< 24h)**, `/login` goes straight to the **registration**
       form (no code needed — the inviteId is the secret).
     - Otherwise, you must confirm the email via a code first (read it from the dev
       console), then register.
- [ ] 5. Complete **registration** (given name, family name, agree terms). Expected: the
     **_Invitee user_** account is created and you are redirected to the claim route for
     _Invite-only_ with the invite params, so the claim form renders even though the badge
     is **not** publicly claimable (the invite authorizes it).
- [ ] 6. Submit the claim. Expected: the _Invitee_'s _Invite-only_ claim is created; the
     prior invite endorsement is connected to it (and stray self-invites cleaned up). If
     _Invite-only_ requires no review it is **valid** immediately.

> **Non-admin invite** requires `capabilities.inviteRequires`. A non-admin user can only
> award/invite a badge whose `json.capabilities.inviteRequires` names a badge they hold a
> valid claim of; otherwise `/achievements/<id>/award` redirects back to the achievement (no
> Award button). See `canInviteToAchievement` and the invite ADRs cited below.

## B. Review flow for _Reviewed_ — **member/reviewer/steward/admin**

A claim against _Reviewed_ starts **invalid** (no `validFrom`) and becomes valid once enough
**current** endorsements accrue, or a steward/admin short-circuits it.

### B1 — create the not-yet-valid claim

- [ ] 7. Have a claimant hold a _Reviewed_ claim. If _Reviewed_ is publicly claimable, the
     **_Member user_** claims it at **`/achievements/<Reviewed id>/claim`**; otherwise the
     _Admin_ awards it (part A) and the recipient accepts. Expected: the new claim is
     **not valid yet** — `/claims/<id>` shows it **under review**, e.g. _"This badge is
     still under review."_ or _"Not yet reviewed. This badge is valid once it accumulates
     {N} endorsements by holders of: <reviewer badge>"_.
- [ ] 8. **Steward notification.** If _Reviewed_ has stewards, claiming/awarding triggers
     `notifyStewardsForReview` for each **current** steward (skipping the claimant if they
     are a steward). Expected: a `REVIEW_NEEDED` notification "email" prints to the dev
     console (subject to the user's `notifications.email` preference, default **on**). A
     `Message` row is recorded **only on a successful send**.
- [ ] 9. **Debounce / throttle.** Trigger review-needed again for the **same**
     (org, steward, type, achievement) within ~3 days (e.g. re-award or a second claim).
     Expected: **no duplicate email** is sent — the throttle suppresses it
     (`suppressed_throttle`), and no new `Message` row is written. (Purge with
     `pnpm run purgeMessages` if you want to re-test cleanly.)

### B2 — record a rubric-scored review

Performed by a **reviewer**: an **_Admin_**, an assigned **steward**, or a holder of the
badge named by `reviewRequires` — **never the claimant on their own claim** (the endorse
button is hidden for the claim owner).

- [ ] 10. As a reviewer, open **`/claims/<Reviewed claim id>`** and click **Endorse** →
      **`/claims/<Reviewed claim id>/endorse`**. Expected: the endorse form renders a
      narrative, an evidence URL, and a **rubric** — one radio group per `ResultDescription`,
      its `allowedValue`s as options. If _Reviewed_ has **no** rubric, a default
      **Pass/Fail** group is shown (the sentinel RD).
- [ ] 11. Pick an **allowedValue per criterion**, optionally add narrative/evidence, submit.
      Expected: a `ClaimEndorsement` is created/updated with
      `json.results = [{ type:['Result'], resultDescription:<rdId>, value, name }]` — the
      criterion **name is snapshotted** onto each result. The confirmation renders the
      recorded narrative/evidence.
- [ ] 12. **Valid after N (or steward/admin short-circuit).** Check
      **`/claims/<Reviewed claim id>`**:
      - **Admin or assigned steward** endorses → the claim becomes **valid immediately**
        (unilateral short-circuit, "like an admin"), regardless of the configured count.
      - **Reviewer-badge** path → the claim becomes valid once **N current** endorsements by
        holders of the `reviewRequires` badge exist (only **current**-rubric reviews count
        toward the threshold). Below N it stays under review.
        Expected once satisfied: the claim shows valid, e.g. _"This badge has received enough
        reviews and is valid."_
- [ ] 13. **"This badge" reviewer option (self-requirement).** If _Reviewed_ was authored so
      the **reviewer badge is itself** (the form's `self` sentinel resolves to the badge's
      own id), then a current holder of _Reviewed_ reviewing a new _Reviewed_ claim counts
      toward validity. Verify a holder's endorsement advances the count as in step 12.
- [ ] 14. **Rubric staleness (optional).** As _Admin_, edit _Reviewed_'s rubric so a criterion
      changes (journey 3 / `/achievements/<id>/edit`); its `urn:uuid` is re-minted. Re-open a
      prior endorsement view: the earlier review is tagged **"Not current"** and **no longer
      counts** toward validity for a not-yet-valid claim. An already-valid claim keeps its
      `validFrom` (staleness never revokes a granted badge).

> ⚠️ Note — endorse-route authority. The endorse server validates a not-yet-valid claim when
> the endorser is an **admin**, an **assigned steward**, or (for the badge-reviewer rule) a
> holder of the `reviewRequires` badge. A plain community member who is none of these can
> submit an endorsement, but it will **not** flip validity on its own unless the
> badge-reviewer/steward/admin conditions are met. The "valid after N" count applies to the
> **badge-reviewer** rule; a single steward/admin review supersedes the count.

## State produced

- **_Invitee user_** — registered via invite (consumed by journey 7).
- A valid **_Reviewed_** claim carrying **rubric results** + the recorded **endorsements**.
- (Optionally) a valid _Invite-only_ claim for the _Invitee_.

## e2e candidate

- **Invite-by-email** — **covered**: `tests/playwright/critical/admin-invite-by-email.spec.ts`.
- **Endorse a claim** — **covered**: `tests/playwright/critical/endorse-claim.spec.ts`.
- **Rubric-results review + valid-after-N + steward notification** — **NEW, P1**. Not covered
  today. Needs a **new seed**: a _Reviewed_ badge with `reviewsRequired = N`, a rubric
  (`resultDescriptions`), and at least one **steward** (the standard
  `tests/playwright/globals/setup.ts` seed has neither rubric nor steward). Seam: assert (a)
  the new claim is under-review, (b) the steward `REVIEW_NEEDED` notification fires once and
  is throttled on repeat, (c) recording rubric results stores `Result`s, (d) the claim flips
  to valid at the Nth current review / on a steward review. Notification assertions read the
  JSON-transport mail (or the `Message` table) rather than a real inbox.

## Citations

- Routes: [`src/routes/achievements/[id]/award/+page.svelte`](../../src/routes/achievements/%5Bid%5D/award/+page.svelte),
  [`src/routes/achievements/[id]/award/+page.server.ts`](../../src/routes/achievements/%5Bid%5D/award/+page.server.ts),
  [`src/routes/claims/[claimId]/+page.svelte`](../../src/routes/claims/%5BclaimId%5D/+page.svelte),
  [`src/routes/claims/[claimId]/endorse/+page.svelte`](../../src/routes/claims/%5BclaimId%5D/endorse/+page.svelte),
  [`src/routes/claims/[claimId]/endorse/+page.server.ts`](../../src/routes/claims/%5BclaimId%5D/endorse/+page.server.ts),
  [`src/lib/components/achievement/ClaimList.svelte`](../../src/lib/components/achievement/ClaimList.svelte),
  [`src/routes/login/+page.server.ts`](../../src/routes/login/+page.server.ts) (invite accept/register),
  `canInviteToAchievement` in [`src/lib/server/permissions.ts`](../../src/lib/server/permissions.ts).
- ADRs: [`../adr/2026-06-09-steward-review-and-messaging.md`](../adr/2026-06-09-steward-review-and-messaging.md)
  (stewards overlay + `Message`/notification + 3-day throttle),
  [`../adr/2026-06-09-achievement-rubrics-results.md`](../adr/2026-06-09-achievement-rubrics-results.md)
  (rubric, snapshotted `Result`s, current-only counting).

> ⚠️ Doc discrepancy (citations). The phase spec cited two ADR filenames that **do not
> exist** in `docs/adr/`: `2026-06-09-badge-steward-review-notifications.md` (the actual file
> is **`2026-06-09-steward-review-and-messaging.md`**) and
> `2026-06-11-this-badge-requirement-option.md` (no ADR file — the "self"/"This badge"
> requirement sentinel is documented inline in
> [`src/lib/data/achievementForm.ts`](../../src/lib/data/achievementForm.ts) as
> `SELF_REQUIREMENT`, referencing a `2026-06-11-this-badge-requirement-option` **plan**, not
> an ADR). Citations above point at the files that actually exist.
