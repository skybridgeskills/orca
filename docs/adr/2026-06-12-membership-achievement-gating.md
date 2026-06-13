# Membership achievement gating for community visibility

- Status: Accepted
- Date: 2026-06-12
- Deciders: ORCA maintainers

## Context

ORCA already lets an org gate the _edit-achievements_ capability behind holding a
specific achievement (`org.json.permissions.editAchievementCapability.requiresAchievement`,
enforced by `canEditAchievements`). We want a parallel notion of **membership**: an
org designates a "membership achievement", and holding a valid claim of it makes a
user a _member_ who can see the community (the members directory, the claims/earners
list on an achievement, and each other's profiles).

Before this change the members list, member profiles, and the achievement claims list
were open to any logged-in org user, with no membership concept and no per-user
control over appearing in the directory.

## Decision

1. **Org-configured membership achievement.** Store
   `org.json.permissions.membershipAchievement.requiresAchievement` (mirrors the
   edit-capability key; configured in `about/edit` via the same `AchievementSelect`
   pattern). A **member** = an admin (`GENERAL_ADMIN`/`CONTENT_ADMIN`) **or** a user
   holding a _valid_ claim of that achievement. "Valid" reuses the existing rule:
   `claimStatus: 'ACCEPTED'`, `validFrom` set, `validUntil` null or future. Enforced by
   `isMember()` in `src/lib/server/permissions.ts`; the validity fragment
   `validMembershipClaimWhere()` is the single source of truth shared by every gated
   query.

2. **Unset = open (backwards-compatible).** When an org has _not_ configured a
   membership achievement, the members list, profiles, and claims list behave exactly
   as before (open to logged-in org users). Gating activates only once an admin sets
   it, so no existing org is disrupted.

3. **Dedicated `User.profileVisibility` column.** A new `Visibility` column (default
   `COMMUNITY`), separate from `defaultVisibility` (which remains _claim_ visibility),
   set in user settings. The threshold for "visible to other members" is the existing
   `COMMUNITY_VISIBLE` set (`PUBLIC|COMMUNITY|ACHIEVEMENT`); `PRIVATE` hides a member
   from other members (admins still see them). A real column — not a `User.json` key —
   so the members-list filter and the claims-list annotation stay query-efficient.

4. **Server-side enforcement; admins are the superset.** All gating lives in load
   functions and the claims API, never only in the client. Admins always pass every
   gate and, as _viewers_, see everyone (members + non-members); admin-only rows render
   as non-clickable plain text rather than being hidden.

5. **Claims-list profile-linkability computed per page, cheaply.** The
   `achievementClaims` API gains a `profileLinkable: boolean` per row, computed for the
   current page with **one** batched `IN` membership query plus the claimant's
   `profileVisibility` — no per-row lookups. `ClaimList` links a claimant name to
   `/members/{userId}` only when `profileLinkable`; otherwise plain text. The claim row
   and its claim-detail link stay visible to anyone who can see the list (claim
   visibility is unchanged), so a non-member's publicly-claimable badge still shows —
   just without a clickable profile. The API also returns `403` to gated non-members
   (defense-in-depth alongside the page-level gate).

## Consequences

- **New access boundary.** Once configured, the members directory and the claims list
  become member-only; this is a behavior change for orgs that opt in (intentional).
- **Public-ish config + API shape.** The membership achievement id is exposed to the
  client like the existing edit-capability id (an achievement id, not a secret). The
  `achievementClaims` API response gains `profileLinkable`.
- **Migration.** One additive, non-destructive column (`profileVisibility`, default
  `COMMUNITY`) — existing rows backfill to `COMMUNITY`.
- **Query cost is bounded.** Gating adds at most one constant query per list page
  (members list for admin viewers; claims list when gated); no per-row N+1.
- **Endorsement tab is conservatively gated.** The invite-creator name in the
  endorsements tab links to a profile only for the creator themselves or an admin
  (the invites endpoint does not compute membership); broader member→member linking
  there is deferred to a moderation fast-follow.

## Alternatives considered

- **Reuse `User.defaultVisibility` for the directory.** Rejected: it conflates claim
  visibility with profile/directory visibility; a dedicated field keeps the two
  independent and is what users expect from a "profile visibility" control.
- **Store `profileVisibility` / membership in `User.json` / org JSON only.** Rejected
  for the user field: a real column is needed for efficient `where`-filtering of the
  members list and the claims annotation.
- **Compute claims-list linkability per row or defer to the claim/detail page.**
  Rejected: a single batched `IN` query per page makes it cheap to decide at the list
  view, so links are hidden there directly.
- **Unset = admins-only.** Rejected: it would silently restrict every org that hasn't
  configured membership; "unset = open" preserves current behavior until opt-in.
