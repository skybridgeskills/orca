# 10 — OAuth & API

OAuth (user-delegated and client_credentials), transaction-service issuer config, and light
API spot-checks. The OAuth flows are **already covered by Playwright** — this journey
**cross-references** those specs rather than re-documenting them, and adds manual
issuer-config + API auth-shape checks. See the [README](./README.md) for conventions and
[`00-setup.md`](./00-setup.md) for accounts. Do not reset between journeys.

## Preconditions

- **_Admin_** of the primary org (from setup).
- At least one **achievement** (journey 2) and a **claim** (journey 4) to read through the
  API.
- A signing keypair (`createKeypair`, setup) for issuance.

## Steps

### A. OAuth user-delegated — DCR + authorization*code + PKCE (actor: \_Admin* + an app)

A confidential/public client registers (Dynamic Client Registration), the user authorizes
at the consent screen (`/ims/ob/v3p0/auth`), the app exchanges the code (with PKCE) for a
**user-scoped** token, and reads the user's credentials. Connected apps are managed at
**`/apps`** ("Connected apps"; revoke per app).

1. - [ ] _Already covered by e2e — do not re-document._ Cross-reference
         [`tests/playwright/oauth-connect.spec.ts`](../../tests/playwright/oauth-connect.spec.ts):
         _"full user-delegated flow: register → authorize → token → getCredentials → refresh →
         revoke"_, plus the RFC7009 revoke test and the negatives (bad secret, PKCE failure,
         reused code, out-of-scope).
2. - [ ] Manual smoke (optional): as a logged-in user, after an app authorizes, open
         **`/apps`** and confirm the app is listed with its **granted scopes** and a
         **Revoke** action; revoking removes it.

### B. OAuth client*credentials — confidential service client (actor: \_Admin*)

A confidential service client gets an **org-level** token (no user) and reads org-scoped
data. Org apps are managed by admins at **`/about/settings/apps`** ("Organization apps";
create → one-time secret reveal → disable → delete).

3. - [ ] _Already covered by e2e — do not re-document._ Cross-reference
         [`tests/playwright/oauth-client-credentials.spec.ts`](../../tests/playwright/oauth-client-credentials.spec.ts):
         _"admin creates org app (modal) → token → scoped API read → disable → delete"_, the
         non-admin redirect away from `/about/settings/apps`, and the scope negatives
         (`unknown scope → invalid_scope`; `wrong scope → insufficient_scope`).
4. - [ ] Manual smoke (optional): as _Admin_ at **`/about/settings/apps`**, **Add an app**,
         confirm the **client id + secret** are shown **once** in the modal, then **Disable**
         and **Delete** the app.

### C. Transaction-service issuer config (actor: _Admin_)

5. - [ ] Go to **`/about/settings/issuer`**. Confirm two sections: **Issuer** (radio choice
         of a local signing key **or** "Wallet exchange via Transaction Service") and
         **Transaction service** (URL, tenant name, API key).
6. - [ ] Fill **Transaction service URL**, **Tenant name**, and an **API key**, **Save
         transaction service**. Expected: the key is **encrypted at rest and never displayed**
         (the page shows "An API key is currently configured (last updated …)"; the input
         placeholder is "Leave blank to keep the current key").
7. - [ ] With the transaction service fully configured, the **"Wallet exchange via
         Transaction Service"** issuer radio becomes selectable. Select it and **Save issuer**.
         Expected: issuance now uses the transaction-service issuer instead of a local signing
         key (issuer selection effect — verify against the credentials journey,
         [`06-credentials.md`](./06-credentials.md)). Switch back to a local signing key
         afterward if later checks expect locally-signed credentials.
8. - [ ] Optional: **Remove API key** clears the configured key; the transaction-service
         issuer option becomes disabled again until reconfigured.

### D. API spot-checks (light; confirm shapes + auth) (actor: _Admin_ / anonymous)

Keep these light. Hit the versioned API under `/api/v1/…`. Expected auth codes below are
what the handlers enforce.

9. - [ ] **`GET /api/v1/achievements`** → returns the org's achievements (paged envelope:
         `data` + `meta`). Org-scoped; not admin-gated. Admins additionally receive
         **suspended** rows with a `suspended` flag; non-admins/anonymous never receive
         suspended rows (moderation enforcement, journey 9).
10. - [ ] **`GET /api/v1/achievementClaims?achievementId=…`** → paged claims. Confirm each
          row carries **`profileLinkable`** (journey 7). With a **membership achievement
          configured**, a gated **non-member** caller gets **403** (`Forbidden`); a member /
          admin gets rows. Missing `achievementId` → **400**.
11. - [ ] **`GET /api/v1/achievements/[id]/invites`** → **401** (`Unauthorized`) when not
          logged in; logged-in non-admins see only their own invites, admins see all
          (cross-reference journey 5, [`05-invites-awards-reviews.md`](./05-invites-awards-reviews.md)).
12. - [ ] **`POST /api/v1/reports`** → **does not require auth** (anonymous reports allowed);
          validates the target is in the current org. Bad/missing body → **400**; unknown
          `targetType` → **400**; missing `targetId`/`reason` → **400**; target in another org
          or nonexistent → **404**; valid → `{ ok: true, reportId }` (journey 9).
13. - [ ] **WebAuthn endpoints** auth shape:
      - `POST /api/webauthn/register/options` and `…/register/verify` → **401** when not
        logged in (registration requires a session).
      - `POST /api/webauthn/authenticate/options` → issues discoverable-login options
        (no session required); `…/authenticate/verify` → **401** without a valid
        cookie-bound pre-auth session / challenge / known credential.
      - `POST /api/webauthn/2fa/verify` → **401** unless the cookie session is
        email-verified-but-not-yet-valid with a single-use challenge and a credential
        belonging to that session's user (journey 8/9).

> ⚠️ Note — `/api/v1/reports` is intentionally **unauthenticated** (anonymous reporting on
> public surfaces, per the moderation ADR). It is org-scoped and validates the target, but
> there is **no** rate-limiting this round (a documented, accepted risk). Not a bug.

## State produced

**None new.** (OAuth clients/tokens created in sections A–B validate the flows; the
transaction-service config is reversible.)

## e2e candidate

- **OAuth flows are already covered** — link the two specs above, do **not** re-author them.
- **API shape checks = P2** (several are unit-covered: the webauthn endpoints, reports
  validation, and the membership gate on `achievementClaims` have server tests). A thin
  Playwright "auth-shape" pass (401/403/400 matrix) is nice-to-have. See
  [`automation.md`](./automation.md).
- **Seam note:** API checks fit the default seed (one org + one claimable achievement);
  the membership-gate 403 needs the journey-7 membership fixture.

## Citations

- Routes: `/apps` (`src/routes/apps/+page.svelte`),
  `/about/settings/apps` (`src/routes/about/settings/apps/+page.svelte`),
  `/about/settings/issuer` (`src/routes/about/settings/issuer/+page.{svelte,server.ts}`),
  `/ims/ob/v3p0/auth` (`src/routes/ims/ob/v3p0/auth/+page.svelte`); API under
  `src/routes/api/[[version]]/…` (`achievements`, `achievementClaims`, `reports`,
  `webauthn/*`).
- Existing e2e:
  [`tests/playwright/oauth-connect.spec.ts`](../../tests/playwright/oauth-connect.spec.ts),
  [`tests/playwright/oauth-client-credentials.spec.ts`](../../tests/playwright/oauth-client-credentials.spec.ts).
- ADRs (moderation enforcement / membership gate referenced above):
  [`../adr/2026-06-13-reporting-and-moderation-model.md`](../adr/2026-06-13-reporting-and-moderation-model.md),
  [`../adr/2026-06-12-membership-achievement-gating.md`](../adr/2026-06-12-membership-achievement-gating.md).
