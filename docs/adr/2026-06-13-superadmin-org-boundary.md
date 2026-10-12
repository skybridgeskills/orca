# Superadmin org & cross-org moderation boundary

- Status: Accepted
- Date: 2026-06-13
- Deciders: ORCA maintainers

## Context

Content reports must reach **site-level** moderators who span all orgs, and those
moderators must be able to view a reported item and apply a SITE-tier suspension that
an org admin cannot override. ORCA is otherwise strictly single-org: a `Session` is
scoped to one `organizationId`, `User` rows are per-org, and `hooks.server.ts` resolves
exactly one org per request. We needed a site-admin capability **without** inventing a
new cross-org authentication path (the riskiest possible change).

## Decision

1. **Site superadmins are real users of a dedicated "superadmin org."** Its id is the
   env var **`SUPERADMIN_ORG_ID`** (`$env/dynamic/private`). Superadmins are
   pre-provisioned admin users of that org via `createAdmin` (which gained an org
   selector). They authenticate with the normal magic-link flow into their **own** org —
   **no new auth path**, and nothing auto-logs-in from a notification email.

2. **Reports fan out to superadmins as Messages in the superadmin org.** A report in
   org X creates `Message` rows for the superadmin-org admins with
   `organizationId = SUPERADMIN_ORG_ID` and `reportId` set, so they appear in the
   superadmins' own-org inbox. The origin org lives on the `Report` row
   (`originOrgId`), not on the Message.

3. **Cross-org reads/writes are capability-bound and guarded, fail-closed.** A
   superadmin opens a cross-org report **only** through their own `Message` row
   (`message.findFirst({ id, userId: me, organizationId: locals.org.id })` → 404
   otherwise). The origin org is read from `report.originOrgId`, **never** from client
   input. Any cross-org read/suspend calls `requireSuperadminOrg(locals)` —
   `locals.org.id === SUPERADMIN_ORG_ID` with a logged-in user — which **fails closed**
   (403) when the env is unset or the viewer is not in the superadmin org. The single
   un-`locals.org`-scoped content read lives in one audited helper (`loadReportTarget`,
   origin-org-scoped, logs cross-org access). Superadmin suspensions write `tier: SITE`.

4. **Fail-closed everywhere.** With `SUPERADMIN_ORG_ID` unset, superadmin fan-out is
   skipped (origin-org admins still notified) and all cross-org access is denied; only
   ORG-tier moderation is available.

## Consequences

- Reuses real sessions/auth; the only privileged operation is a contained cross-org
  read/suspend behind one guard + a capability (the Message). No bespoke cross-org login.
- The superadmin org must be a non-customer-facing org whose id is set in
  `SUPERADMIN_ORG_ID`; misconfiguration degrades safely (features off), never open.
- **Residual risk (accepted, fast-follow):** the superadmin org uses the same
  magic-link auth as any org, so a superadmin-account compromise grants cross-tenant
  moderation power. Hardening that org (MFA / allowlist / stronger provisioning) is a
  planned follow-up.

## Alternatives considered

- **`SITE_SUPERADMIN_EMAILS` env list + a novel cross-org login / step-up** — rejected:
  invents a new authentication path (high risk) and an email-keyed `Message` recipient
  (would require nullable `userId` + `recipientEmail`).
- **Pre-provision superadmins as admins in every org** — rejected: O(orgs) provisioning
  and no clean SITE-vs-ORG distinction.
- **Auto-login superadmins from the notification email link** — rejected: explicitly
  disallowed; the superadmin authenticates into their own org first.
