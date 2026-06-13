# 09 — Reporting & moderation

Report user-generated content via the "…" menu, then moderate it: an **org admin** suspends
at the **ORG** tier; a **superadmin** (optional track) suspends at the **SITE** tier that an
org admin cannot lift. See the [README](./README.md) for conventions and
[`00-setup.md`](./00-setup.md) for the **superadmin-org** and **passkey** tracks. Do not
reset between journeys.

ADRs:
[`../adr/2026-06-13-reporting-and-moderation-model.md`](../adr/2026-06-13-reporting-and-moderation-model.md),
[`../adr/2026-06-13-superadmin-org-boundary.md`](../adr/2026-06-13-superadmin-org-boundary.md).

## Preconditions

- Content to report, from earlier journeys: an **achievement** (journey 2), a **claim**
  (journey 4), and an **endorsement/invite** (journey 5).
- **_Admin_** of the primary org (from setup), with a [`/messages`](./README.md) inbox.
- **Superadmin track (optional):** `SUPERADMIN_ORG_ID` set to a distinct superadmin org, and
  a **_Superadmin_** admin user provisioned **in that org** (see
  [`00-setup.md`](./00-setup.md) track A). If the user has a passkey (journey 8), their login
  is **email + passkey 2FA** (track B).

> ⚠️ **Graceful degradation:** with `SUPERADMIN_ORG_ID` **unset**, this journey still covers
> the **org-admin / ORG-tier** path (sections A–C). The cross-org/SITE/2FA path (section D)
> is simply skipped — superadmin fan-out doesn't happen and all cross-org reads/writes
> fail closed (403). Mark section D steps as **superadmin-track**.

## Steps

### A. Report content (actor: any viewer, incl. anonymous on a public surface)

The report trigger is the **"…"** kebab labeled **"Report content"**; it opens the report
modal (reason select + optional description → **"Submit report"**). It posts to
`POST /api/v1/reports`. Reporter identity/status is derived **server-side** from the session
(never trusted from the client); **anonymous** reporters are allowed on public surfaces.

1. - [ ] On an **achievement detail** page (`/achievements/[id]`), open the "…" →
         **"Report content"**, pick a **Reason**, optionally add a description, **Submit
         report**. Expected: the modal closes on success (`{ ok: true }`); target type
         `ACHIEVEMENT`.
2. - [ ] On a **claim detail** page (`/claims/[id]`), repeat via the claim's "…" menu
         (target type `CLAIM`). On a **public** claim (ACCEPTED + PUBLIC), do this **logged
         out** to exercise an **anonymous** report on a public surface.
3. - [ ] On an **endorsement** row (the endorsements list / `EndorsementList`), open that
         row's "…" → **"Report content"** and submit (target type `ENDORSEMENT`).
4. - [ ] Negative shape checks (optional): a `POST /api/v1/reports` with an unknown
         `targetType` → **400**; a `targetId` from **another org** or nonexistent → **404**
         (org-scoped target lookup). See [`10-oauth-and-api.md`](./10-oauth-and-api.md).

### B. Org-admin sees the report Message (actor: _Admin_)

5. - [ ] As _Admin_ of the primary org, open **`/messages`** (the "Messages" inbox).
         Expected: a **report message** appears per submitted report, titled for a reported
         content message, with a short descriptor (target type — reason). It shows a relative
         time and an **"Open"** badge.
6. - [ ] Open the message → **`/messages/[id]`**. Expected: you see the **reason**, optional
         **description**, the reporter **STATUS** chip (e.g. Anonymous / User / Member /
         Admin), the **reported content** (read-only), and the current suspension state
         (initially **"Active (not suspended)"**).
7. - [ ] Confirm the org admin does **NOT** see the reporter's **identity** — only the
         status chip (identity is loaded only in the superadmin/cross-org branch, server-side).

### C. Org-tier suspension (actor: _Admin_)

8. - [ ] On `/messages/[id]`, in the **Actions** section, optionally enter a reason and click
         **"Suspend"** (org tier). Expected: the page shows **"Suspended (org)"** with a
         timestamp (form action `?/suspend` → an ORG-tier `ModerationAction` row).
9. - [ ] Verify the content is now **hidden from public/community**: as an anonymous/public
         viewer, the suspended achievement no longer appears in public lists / the OB2 public
         emitter; as an admin it still shows, **flagged** as suspended.
10. - [ ] Verify it **blocks new claims/issuance**: attempting to claim the suspended
          achievement (or issue a credential for suspended content) is blocked — ties back to
          the credentials journey ([`06-credentials.md`](./06-credentials.md)).
11. - [ ] As _Admin_, **Lift** the suspension (the **"Lift suspension"** button appears
          because an ORG actor may lift an ORG-tier suspension; form action `?/lift`).
          Expected: state returns to **"Active (not suspended)"** and the content reappears.

> ⚠️ Note — pagination counts: per the moderation ADR, suspended rows are hidden from list
> _content_ but pagination **counts** may still include them (an accepted speed/exactness
> tradeoff). The achievement list, search, and OB3 wallet emitters are documented
> deferred-enforcement surfaces. Not bugs.

### D. Cross-org SITE suspension (actor: _Superadmin_; **superadmin track**, **passkey track** if 2FA)

12. - [ ] **Log in as _Superadmin_ into THEIR own org** (the superadmin org), via the normal
          magic-link flow at `/login`. **If the _Superadmin_ has a passkey**, login is a
          two-factor flow (email then passkey): submit email, enter the emailed code, then the
          form advances to a **"Confirm with passkey"** step (the session is email-verified but
          not yet valid) — complete the passkey assertion (`POST /api/webauthn/2fa/verify`) to
          activate the session. A superadmin with **no** passkey logs in with **email alone**.
          Nothing auto-logs-in from a notification email; the superadmin authenticates into
          their own org first.
13. - [ ] In the superadmin org's **`/messages`** inbox, open the **cross-org report**
          Message (it carries a **"Cross-community review"** badge). Expected: here the
          **reporter identity** IS shown (the superadmin/cross-org branch loads it,
          server-gated by `requireSuperadminOrg`, fail-closed).
14. - [ ] Confirm the read is **capability-bound**: the superadmin reaches the cross-org
          report **only** through their own Message row in their current org (id + userId +
          org) — there is no way to read another org's report by guessing ids; the origin org
          is derived from `report.originOrgId`, never client input.
15. - [ ] Click **"Suspend (site-wide)"** (the SITE-tier suspend; the button label reflects
          the viewer's authority). Expected: **"Suspended (site)"**. The content is hidden
          from public/community and blocks new claims/issuance across the origin org.
16. - [ ] **Back as the origin-org _Admin_**, open the same report's `/messages/[id]`.
          Expected: there is **no "Lift suspension" button**; instead the message
          **"Suspended by a site administrator — your community cannot override this."** is
          shown. If the org admin POSTs `?/lift` anyway, the server rejects with **403**
          (an ORG actor cannot lift a SITE suspension — `canLift` = actor tier ≥ suspension
          tier, enforced server-side).

## State produced

- **Suspended content + moderation actions** (`ModerationAction` rows). Note: if you lifted
  in step 11 and want a clean later state, leave the SITE suspension from section D in place
  (or lift it as the _Superadmin_, who **can**).

## e2e candidate

- **Yes — report → message → ORG-suspend → hidden + blocks claims = P1.** Fits a single org;
  needs a seed with reportable content + an org admin + an inbox.
- **Cross-org SITE + org-can't-override + 2FA = P1 but high-setup.** Needs a **second org**,
  `SUPERADMIN_ORG_ID`, and (for 2FA) a passkey + **virtual authenticator**. May stay
  **manual** until a multi-org fixture exists. Mark in [`automation.md`](./automation.md).
- **Seam note:** the ORG path does not fit the default single-org/one-achievement seed
  (needs the moderation message + suspension surfaces); the SITE path needs a brand-new
  multi-org + env-var + authenticator fixture.

## Citations

- ADRs:
  [`../adr/2026-06-13-reporting-and-moderation-model.md`](../adr/2026-06-13-reporting-and-moderation-model.md),
  [`../adr/2026-06-13-superadmin-org-boundary.md`](../adr/2026-06-13-superadmin-org-boundary.md)
- Surfaces: the "…" report menu (`src/lib/components/KebabMenu.svelte`,
  `src/lib/components/moderation/ReportModal.svelte`), `POST /api/v1/reports`,
  `/messages` (`src/routes/messages/+page.{svelte,server.ts}`),
  `/messages/[id]` (`src/routes/messages/[id]/+page.{svelte,server.ts}`),
  the 2FA endpoint `src/routes/api/[[version]]/webauthn/2fa/verify/+server.ts`.
