# 04 — Claiming

How a member of the public earns a badge: the **public open claim** of _Member_ (anonymous
→ claim → email code → register → authenticated member), then the **prereq-gated claim** of
_Gated_ (blocked before holding _Prereq_, allowed after). This journey **produces the
_Member user_** and the first valid claims the later journeys reuse.

Do the [setup](./00-setup.md) first, and run after journey
[02 — Achievement authoring](./02-achievement-authoring.md) (it authors the badges consumed
here). **Do not reset the database** — see the [README](./README.md).

## Preconditions

- The badges from journey 2 exist and are **claimable**: _Member_ (public, no prerequisite,
  no review), _Prereq_ (claimable), and _Gated_ (claimable, **`claimRequires` = _Prereq_**).
- An email address you can read codes for (any address works in dev — codes print to the
  dev server console; see [00-setup.md](./00-setup.md#reading-login-codes-dev)). This becomes
  the **_Member user_**. Use a **different** address than the _Admin_.
- For the steps below, start **logged out** (the public open-claim path begins anonymous).

## A. Public open claim of _Member_ — **public** (works logged-out)

Performed by an **anonymous visitor** who becomes the **_Member user_**.

- [ ] 1. **Logged out**, open the _Member_ badge at **`/achievements/<Member id>`**. Expected:
     the badge renders publicly; under "Claim rules" you see _"Anybody can claim this
     badge"_-style copy (the public, no-prereq case), and a **"Claim"** button is shown
     (the page shows Claim because _Member_ is `claimable` with `claimRequiresId == null`).
- [ ] 2. Click **Claim** → lands on **`/achievements/<Member id>/claim`**. Expected: because
     the badge is public with no prerequisite, the **claim form** (`ClaimForm`) renders
     immediately (optional narrative + evidence URL).
- [ ] 3. Submit the claim form while still anonymous. Expected: you are routed into the login
     flow — the claim is held pending (`claimPending` / `claimEmail` stores) and you are
     asked for your **email** on **`/login`**.
- [ ] 4. On **`/login`**, enter the _Member user_ email and submit. Expected: a 6-digit code
     is generated and "emailed". **Read the code from the dev server console**
     ([why](./00-setup.md#reading-login-codes-dev)).
- [ ] 5. Enter the code on the **verify** step. Expected: because this email has **no user
     account yet and no invite**, the server returns `register: true` and the page advances
     to the **registration** form (given name, family name, agree-to-terms).
- [ ] 6. Fill **given name** + **family name**, tick **agree to terms**, submit. Expected:
     the account is created, the session activates, and you are redirected (the held claim
     resumes). Leaving terms unticked must be **rejected** (the register action errors on
     `agreeTerms == 'no'`).
- [ ] 7. You are now an **authenticated _Member user_**. Open
     **`/claims/<your Member claim id>`**. Expected: the claim shows **ACCEPTED** and
     **valid** (_Member_ requires no review, so `validFrom` is set at creation → "This badge
     requires no review and is valid"). The owner view shows manage actions
     (Edit / Reject) and, for the accepted claim, share + **Download** affordances.

> ⚠️ Note — the open-claim → login handoff. The unauthenticated submit does not POST the
> claim; it stashes intent client-side and drives the login/register ceremony, then resumes.
> If a code seems "lost", confirm you are reading the **dev console**, not an inbox (dev uses
> the JSON mail transport).

**State produced so far:** the **_Member user_** account + a valid _Member_ claim. The user
now holds the org's `membershipAchievement` (set in journey 2) and is a community **member**
(consumed by journey 7).

## B. Prereq-gated claim of _Gated_ — **member-only** (must be logged in)

Performed by the **_Member user_** from part A. _Gated_ has **`claimRequires` = _Prereq_**.

### B1 — blocked before holding _Prereq_

- [ ] 8. As the _Member user_, open **`/achievements/<Gated id>`**. Expected: under "Claim
     rules" the page states the badge **requires** _Prereq_ (a link to the _Prereq_
     achievement) and, because you do **not** yet hold _Prereq_, the "you don't meet the
     requirements" copy — **no "Claim" button is rendered** (the button only shows when
     `claimRequiresId == null` or you hold the required achievement).
- [ ] 9. Navigate directly to **`/achievements/<Gated id>/claim`** anyway. Expected: the page
     does **not** show the claim form; it shows the **"You do not meet the requirements"**
     heading + a warning linking to _Prereq_ (the `{:else if claimable && claimRequiresId}`
     branch). The claim form is withheld.
- [ ] 10. (Defense-in-depth) If you force the **claim** action without holding _Prereq_ and
      without an invite, the server **rejects** it with a 400 / "not eligible" error
      (`achievement.claimRequiresId && !requiredBadgeClaim && !invite`). No claim row is
      created.

### B2 — claim _Prereq_, then _Gated_ is allowed

- [ ] 11. Open **`/achievements/<Prereq id>`** → **Claim** →
      **`/achievements/<Prereq id>/claim`**. Expected: _Prereq_ is claimable (assume no
      prerequisite/no review per journey 2), so the form renders; submit it. The _Prereq_
      claim is created **valid** immediately and you land on its `/claims/<id>`.
- [ ] 12. Return to **`/achievements/<Gated id>`**. Expected: now that you hold a **valid**
      _Prereq_ claim, the "requirements met" copy shows and the **"Claim"** button appears.
- [ ] 13. Click **Claim** → **`/achievements/<Gated id>/claim`**. Expected: the prerequisite
      gate passes (`requiredBadgeClaim` is found) and the **claim form renders**. Submit it.
      Expected: the _Gated_ claim is created **valid** (no review configured) and you are
      redirected to **`/claims/<Gated claim id>`** showing ACCEPTED + valid.

> Immediate-validity vs review-required. _Member_, _Prereq_, and _Gated_ all become valid the
> instant they are claimed because none requires review. The **review-required** path
> (a claim that starts **invalid** until N endorsements / a steward) is exercised on
> _Reviewed_ in [05 — Invites, awards & reviews](./05-invites-awards-reviews.md).

## State produced

- **_Member user_** — a registered community member (holds the `membershipAchievement`).
- Valid **_Member_**, **_Prereq_**, and **_Gated_** claims owned by the _Member user_.

These feed journey 5 (the same user can endorse), journey 6 (a valid claim to issue a
credential for), and journey 7 (membership/visibility).

## e2e candidate

- **Public open claim + login/register** — **covered**. Existing critical specs
  `tests/playwright/critical/public-open-claim-and-login.spec.ts` and
  `tests/playwright/critical/auth-open-claim-no-invite.spec.ts` exercise the anonymous →
  claim → code → register → valid-claim path against the standard seed (one org + one public
  claimable achievement). No new automation needed for part A.
- **Prereq-gated claim (blocked → allowed)** — **NEW, P1**. Not covered today. Needs a seed
  with a second achievement whose `claimRequires` points at a prerequisite badge — the
  current `tests/playwright/globals/setup.ts` seed has only one claimable achievement, so
  this requires a **new fixture** (two achievements + the `claimRequiresId` link). Seam:
  assert (a) no Claim button + the form-withheld branch before holding _Prereq_, (b) the
  server 400 on a forced claim, (c) Claim button + valid claim after _Prereq_ is held.

## Citations

- Routes: [`src/routes/achievements/[id]/+page.svelte`](../../src/routes/achievements/%5Bid%5D/+page.svelte),
  [`src/routes/achievements/[id]/claim/+page.svelte`](../../src/routes/achievements/%5Bid%5D/claim/+page.svelte),
  [`src/routes/achievements/[id]/claim/+page.server.ts`](../../src/routes/achievements/%5Bid%5D/claim/+page.server.ts),
  [`src/routes/login/+page.svelte`](../../src/routes/login/+page.svelte),
  [`src/routes/login/+page.server.ts`](../../src/routes/login/+page.server.ts),
  [`src/routes/claims/[claimId]/+page.svelte`](../../src/routes/claims/%5BclaimId%5D/+page.svelte).
- ADR: [`../adr/2026-06-12-membership-achievement-gating.md`](../adr/2026-06-12-membership-achievement-gating.md)
  (holding _Member_ makes the user a community member).
  </invoke>
