# Reporting & moderation domain model

- Status: Accepted
- Date: 2026-06-13
- Deciders: ORCA maintainers

## Context

ORCA had no way for users to report user-generated content (achievements, claims,
endorsements/invites) and no way for admins to take content down. We needed: a report
submission flow (available to anyone who can see the content, including anonymous
viewers on public surfaces), notifications to the right admins, and a way to suspend
content — with a distinction between an org admin's action and a site (superadmin)
action so that an org admin cannot quietly undo a site-level takedown.

## Decision

1. **`Report` model** — a polymorphic report against a content target:
   `originOrgId` (the org whose content was reported), `targetType`
   (`ACHIEVEMENT|CLAIM|ENDORSEMENT`) + `targetId`, `reporterUserId?` (null = anonymous),
   `reporterStatus` (a **snapshot** of `ANONYMOUS|USER|MEMBER|ADMIN` computed
   server-side at submit time via the session + `isMember`), `reason`, `description?`.
   The submit endpoint validates the target belongs to the current org and **never
   trusts client-supplied reporter identity/status**.

2. **Reporter identity is hidden from org admins.** Org admins see only
   `reporterStatus`; the reporter's identity (`reporterUserId` / user row) is returned
   only to superadmin-org viewers, and the gating is enforced in the server load (the
   returned payload), not the template.

3. **Notifications reuse the `Message` system.** A new `MessageType.CONTENT_REPORTED`
   and a `Message.reportId` link. A report fans out one `Message` per recipient
   (origin-org admins + superadmin-org admins) through the existing `sendUserMessage`
   (preference check + per-recipient throttle + email). `Message.organizationId` is the
   recipient's **reading-context** org. The email links to the recipient's own-org
   message-detail view.

4. **Suspension = a polymorphic `ModerationAction` table**, not per-model columns:
   `(originOrgId, targetType, targetId, action: SUSPEND, tier: ORG|SITE, actorUserId,
actorOrgId, reason?, createdAt, liftedAt?, liftedByUserId?, liftedTier?)`. An
   **active suspension** is an unlifted `SUSPEND` row; when both tiers are active, SITE
   governs. The table doubles as an audit log. **A SITE suspension cannot be lifted by
   an ORG-tier actor** (`canLift` = actor tier ≥ suspension tier); tier is derived from
   the actor's org (SITE iff the superadmin org), never the client.

5. **Enforcement is centralized + server-side.** `activeSuspensionFor` (single) and
   `activeSuspensionsFor`/`annotateSuspensions` (batched, no N+1 for lists) back the
   read-path rule: suspended content is **hidden** from public/community, **flagged**
   for admins, and **blocks** new claims + credential issuance (incl. the OB2 public
   emitters).

## Consequences

- New moderation surface and an additive migration (`Report`, `ModerationAction`,
  `Message.reportId`, enums). Non-destructive.
- Anonymous reporting is possible on public surfaces (achievement detail, public
  claim); anti-abuse rate-limiting is **not** implemented this round (noted risk).
- Suspension hides content broadly but a few surfaces are intentionally deferred
  (pagination _counts_ still include suspended rows — DB-speed over exact filtered
  counts, an accepted product tradeoff; OB3 wallet emitters; the `achievementClaims`
  list; search). These are documented, not silent.
- The polymorphic table keeps the three content models untouched and gives a single
  audited place for the suspend/lift authority + enforcement reads.

## Alternatives considered

- **Per-model suspension columns** on Achievement/Claim/Endorsement — rejected:
  triplicated schema, no built-in audit history, more migration surface.
- **Reuse `AchievementStatus`/`ClaimStatus`** for suspension — rejected: conflates
  moderation with lifecycle/claim state and has no tier/actor/audit.
- **Exact filtered pagination counts** — rejected for now in favor of query speed; may
  revisit with cursor/endless-scroll lists.
