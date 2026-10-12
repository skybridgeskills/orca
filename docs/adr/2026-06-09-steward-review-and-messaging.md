# Steward review overlay & user messaging

- Status: Accepted
- Date: 2026-06-09 (steward authority model revised 2026-06-11 — see Decision 3)
- Deciders: ORCA maintainers

## Context

Before this work, a claim's review requirement was one of: none, "an admin must
review," or "a holder of badge X must review" (`Achievement.reviewRequiresId` +
`json.reviewsRequired`). There was **no way to designate specific people** as
reviewers for an achievement, and **no notification** when a claim started needing
review — reviewers had to discover pending claims themselves.

Two capabilities were wanted:

1. **Stewards** — named org members an editor assigns to an achievement, who can
   approve its claims.
2. **Notifications** — email those stewards when a claim needs review, without
   spamming them, and respecting a user preference.

There was no model for logging user-directed messages (needed for throttling and
retention) and `User` had no place to store preferences.

## Decision

1. **`Message` model + 30-day retention.** A generic log
   `Message { id, organizationId, userId, type: MessageType, achievementId?,
claimId?, createdAt }` (enum starts at `REVIEW_NEEDED`). A row is written **only on
   a successful send**. Throttling queries `(organizationId, userId, type,
achievementId, createdAt > now − 3d)`; garbage collection deletes
   `createdAt < now − 30d`. `achievementId`/`claimId` are loose scalars (no FK) — it
   is a log, not a relation graph.

2. **Notification preferences in `User.json`.** `json.notifications.email` (default
   **on** when unset). A single reusable seam `sendUserMessage(...)` centralizes the
   preference check → throttle → send → record, returning a discriminated result
   (`sent | suppressed_pref | suppressed_throttle | failed`) and never throwing, so a
   notification failure can never break a claim flow.

3. **Stewards as an additive overlay (revised 2026-06-11).** Stewards are stored as
   `Achievement.json.stewards: string[]` and are an **orthogonal overlay**, not a
   mutually-exclusive review type. They coexist with any base rule (none/admin/badge
   - `reviewsRequired`). A single review by an assigned steward (or an admin)
     validates a claim **immediately** — a unilateral short-circuit exactly parallel to
     the admin bypass — **regardless of the base rule** and superseding its
     `reviewsRequired` count. (The originally-planned design made steward a fourth,
     mutually-exclusive review _type_; it was revised to the overlay because the overlay
     composes with badge review — "5 holders of Z, **or** any steward" — subsumes the
     exclusive case, and removes the need for any persisted review-type discriminator.)
   * **Where it applies:** a steward's _endorsement_ validates (the endorse flow); a
     prior steward endorsement validates the claim when the claimant self-claims or
     re-accepts (claim / updateClaim). A steward does not self-validate their own
     claim.
   * **No FK integrity:** steward IDs are validated against current org members on
     write, and member-filtered on read (stale IDs are tolerated/dropped).

4. **Throttled, preference-aware notifications.** When a claim starts needing review
   and the achievement has stewards, each **current** steward (member-filtered) is
   notified via `sendUserMessage`, skipping the claimant if they are themselves a
   steward. The 3-day throttle makes repeat triggers (e.g. multiple awards) safe.

5. **Shared HTML email template.** All transactional emails (login OTP, both
   invitations, the steward notification) render a themed, table-based HTML body via
   `renderOrcaEmail`, keeping a plaintext fallback.

## Consequences

- A new domain model (`Message`) and a new `User.json` column ship via one additive
  migration. The model baseline is the flattened `Achievement` from ADR
  `2026-06-09-achievement-config-merge`.
- Stewards compose with badge review, which the exclusive design could not express;
  there is no review-type discriminator to keep in sync.
- Because steward validation is a short-circuit, a steward review can validate a
  claim even when a higher review count was configured — this is intended ("like an
  admin"). The count still governs badge-only reviews.
- Notifications are best-effort: a send failure logs and continues; the throttle and
  preference checks suppress without surfacing errors to the claim flow.
- Stale steward IDs (a member who left) are silently dropped at validation /
  notification time rather than enforced by a FK.
- Garbage collection is a guarded endpoint + script; no production scheduler is
  required (Vercel Cron can call it).

## Alternatives considered

- **Steward as a mutually-exclusive review type** (original plan). Rejected: cannot
  express badge + stewards, needs a persisted/inferred review-type discriminator, and
  is subsumed by the overlay (admin-base + stewards == the old "steward type").
- **A `Steward` join table with FKs.** Rejected for now: the JSON list avoids a
  migration and matches the achievement-config-merge direction (config lives in
  `Achievement.json`); the cost is no referential integrity, handled by
  validate-on-write + member-filter-on-read.
- **In-app notifications / per-type preferences.** Deferred; `User.json.notifications`
  is shaped to allow later expansion.
