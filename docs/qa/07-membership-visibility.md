# 07 — Membership & visibility

How the community surfaces (`/members`, `/members/[id]`, and the achievement claims list)
behave for a **member**, a **non-member**, and an **admin** once an org has configured a
membership achievement. See the [README](./README.md) for conventions and
[`00-setup.md`](./00-setup.md) for accounts. Do not reset between journeys.

ADR: [`../adr/2026-06-12-membership-achievement-gating.md`](../adr/2026-06-12-membership-achievement-gating.md).

## Preconditions

- `membershipAchievement` is configured on the org (set in journey 2,
  [`02-achievement-authoring.md`](./02-achievement-authoring.md)) — i.e.
  `org.json.permissions.membershipAchievement.requiresAchievement` points at the _Member_
  badge.
- **_Member user_** exists and holds a **valid** _Member_ claim (journey 4,
  [`04-claiming.md`](./04-claiming.md)) — `ACCEPTED`, `validFrom` set, `validUntil` null or
  future.
- A **non-member**: a logged-in same-org user who does **not** hold the membership badge.
  Use **_Invitee_** from journey 5 ([`05-invites-awards-reviews.md`](./05-invites-awards-reviews.md)),
  who registered via an invite to a non-membership badge and so is not a member.
- **_Admin_** (from setup).
- At least one publicly-claimable badge with a claim from the non-member, plus a member's
  claim, on the same achievement (use the claims produced in journeys 4–5). This drives the
  claims-list link test.

> A user is a **member** if they are an _Admin_ (`GENERAL_ADMIN`/`CONTENT_ADMIN`) **or**
> hold a valid claim of the membership achievement. Admins always pass every gate.

## Steps

### A. Member viewer (actor: _Member user_)

1. - [ ] As _Member user_, go to **`/members`**. Expected: the page loads (no redirect);
         you see yourself plus other **community-visible members**. Non-members do **not**
         appear. Each listed member card has a clickable name + "View profile" link.
2. - [ ] Click a member card → lands on **`/members/[id]`** for that member; their profile
         (name, visible identifiers, visible claims) renders.
3. - [ ] Open your own profile from `/members` (or the "Edit profile" affordance). Expected:
         you can always see **yourself** even if your own `profileVisibility` is `PRIVATE`
         (self is never hidden).
4. - [ ] Manually navigate to **`/members/[id]`** for the **non-member** (_Invitee_'s user
         id). Expected: you are **redirected to `/members`** — a non-admin member cannot open
         a non-member's profile under gating.

### B. Non-member viewer (actor: _Invitee_)

5. - [ ] As _Invitee_ (logged in, not a member), go to **`/members`**. Expected: you are
         **redirected to `/`** — the directory is member-only when gating is active.
6. - [ ] Navigate directly to a **member's** `/members/[id]`. Expected: redirected to
         `/members` (which itself redirects you to `/`), i.e. no profile access.

### C. Admin viewer (actor: _Admin_)

7. - [ ] As _Admin_, go to **`/members`**. Expected: you see **everyone** in the org —
         members **and** non-members.
8. - [ ] Confirm row rendering: a member row (and your own row) is **clickable** (links to
         `/members/[id]`); a **non-member** row renders as **plain text** (name shown, no link,
         no "View profile" button) rather than being hidden.
9. - [ ] Open a non-member's profile by URL (`/members/[id]`). Expected: an admin **can**
         view it (admins are the superset; the page-level gate lets admins through).

### D. Profile visibility = PRIVATE (actors: _Member user_, then _Admin_)

10. - [ ] As _Member user_, go to **`/settings`**, set **Profile visibility** to **Private**,
          Save (see [`08-settings-and-passkeys.md`](./08-settings-and-passkeys.md) for the
          settings round-trip).
11. - [ ] As a **different member** (if you have a second member; otherwise note it), open
          `/members`. Expected: the now-`PRIVATE` member is **hidden** from the directory and
          their `/members/[id]` redirects you away.
12. - [ ] As _Admin_, open `/members`. Expected: the `PRIVATE` member is **still visible**
          to the admin (rendered per step 8: clickable if a member). Restore the member's
          visibility to **Community** afterward so later journeys see them.

### E. Claims list on an achievement (actors: _Member user_, then _Admin_)

13. - [ ] As _Member user_, open an **achievement detail** page (`/achievements/[id]`) that
          has both the member's and the non-member's claims, and look at the **Claims** list
          (the `ClaimList` table).
14. - [ ] Confirm: a **member's** name is a **profile link** to `/members/[userId]`; the
          **non-member's** name shows as **plain text** (not clickable) — but their **row and
          its "View" claim-detail link still appear** (claim visibility is unchanged; only the
          profile link is gated). This is the per-row `profileLinkable` flag from the
          `achievementClaims` API.
15. - [ ] As _Admin_ on the same list: **every** claimant name (member or non-member) is a
          profile link (admins can open anyone's profile).

> ⚠️ Note — endorsements/invites tab: on the same surface's **Invites/Endorsements** tab,
> the invite-creator name links to a profile only for the **creator themselves or an admin**
> (the invites endpoint does not compute membership). This is the conservative gating called
> out in the ADR (broader member→member linking deferred). Not a bug.

### F. Unset check (open / backwards-compatible) — optional

16. - [ ] _Optional, mutates org config_: as _Admin_, temporarily **clear** the membership
          achievement (`about/edit`, unset the membership `AchievementSelect`). Then as
          _Invitee_ (a non-member) reload `/members`: expected the directory is now **open** —
          every logged-in same-org user is listed and **every** claims-list name links to a
          profile. **Re-set the membership achievement to _Member_ afterward** so journeys
          8–10 keep the gated state.

## State produced

Member visibility states exercised (member / non-member / admin views; `PRIVATE` profile
hide-from-members-not-admins). No new named entities.

## e2e candidate

- **Yes — member-vs-non-member-vs-admin directory gating + claims-list `profileLinkable` =
  P1** (security boundary). The pure pieces (`isMember`, `validMembershipClaimWhere`,
  `profileLinkable`) are unit-tested, but the three-viewer redirect/link matrix is worth an
  end-to-end pass.
- **Seam note:** does **not** fit the default `tests/playwright/globals/setup.ts` seed (one
  org + one claimable achievement). Needs a **new fixture**: a membership badge set as
  `membershipAchievement`, one member, and one non-member (logged-in, no membership claim).
  Flag as new-seed in [`automation.md`](./automation.md).

## Citations

- ADR: [`../adr/2026-06-12-membership-achievement-gating.md`](../adr/2026-06-12-membership-achievement-gating.md)
- Routes: `/members` (`src/routes/members/+page.{svelte,server.ts}`),
  `/members/[id]` (`src/routes/members/[id]/+page.{svelte,server.ts}`),
  the claims list (`src/lib/components/achievement/ClaimList.svelte`) backed by
  `GET /api/v1/achievementClaims`.
