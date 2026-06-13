# Automation recommendations (Playwright e2e)

Which QA journeys to turn into automated Playwright tests, in priority order, with the
seed/fixture each needs. This is a **recommendation** — no specs are written yet.

Priorities: **P0** = critical regression (a real bug we shipped + fixed; guard it),
**P1** = high-value (a security/business boundary or a core spike feature),
**P2** = nice-to-have (stable or already unit-covered).

## Existing coverage (don't duplicate)

| Existing spec                                                       | Covers (journey)                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `critical/achievements-list.spec.ts`                                | Public achievements list, no admin controls when logged out  |
| `critical/admin-create-achievement.spec.ts`                         | Admin creates an open-claim achievement (journey 2 baseline) |
| `critical/admin-invite-by-email.spec.ts`                            | Admin invite-by-email + invite resolves (journey 5)          |
| `critical/auth-open-claim-no-invite.spec.ts`                        | Authenticated member claims an open badge (journey 4)        |
| `critical/endorse-claim.spec.ts`                                    | A member endorses another member's claim (journey 5)         |
| `critical/public-open-claim-and-login.spec.ts`                      | Public self-claim → login → register → claim (journey 4)     |
| `claim-badge.spec.ts`                                               | Claim flow (older)                                           |
| `oauth-connect.spec.ts`                                             | OAuth DCR + authorization_code + PKCE (journey 10)           |
| `oauth-client-credentials.spec.ts`                                  | OAuth client_credentials (journey 10)                        |
| unit: `tests/vitest/lib/credentials/achievementCredentials.spec.ts` | OB3 proof shape / eddsa-rdfc-2022 (journey 6)                |

So the **open-claim, invite, endorse, OAuth, and OB3-proof-shape** paths are already
guarded. Everything below is **new** coverage the spike features warrant.

## Proposed new specs (prioritized)

| Priority | Spec (journey)                              | What it asserts                                                                                                                                                        | Seam                                                                                              |
| -------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **P0**   | `achievement-edit-preserves.spec` (j3)      | Edit a badge with an image (text-only change) → image preserved; edit a Competency → `achievementType` preserved (book-check icon stays). These were real regressions. | New seed: a badge **with an image** + a Competency badge.                                         |
| **P1**   | `claim-prereq-gating.spec` (j4)             | Claiming _Gated_ is blocked without _Prereq_, allowed after claiming _Prereq_.                                                                                         | New seed: two achievements with `claimRequiresId`.                                                |
| **P1**   | `review-rubric-results.spec` (j5)           | Reviewer records rubric `Result`s; claim becomes valid after N reviews; steward `REVIEW_NEEDED` notification + throttle.                                               | New seed: a _Reviewed_ badge (reviewsRequired≥1 + rubric + steward) + a claimant.                 |
| **P1**   | `membership-gating.spec` (j7)               | Member vs non-member vs admin on `/members`, profile access, and claims-list `profileLinkable`; PRIVATE `profileVisibility` hides from members.                        | New seed: a `membershipAchievement` + a member + a non-member.                                    |
| **P1**   | `report-and-org-suspend.spec` (j9)          | Report content → admin Message (status, not identity) → ORG suspend → hidden from public/community + blocks new claims.                                                | Extend global seed: reportable content + an org admin.                                            |
| **P2**   | `add-skills-onboarding.spec` (j2)           | Admin adds a durable skill → Competency badge created (book-check icon, seeded rubric); already-added disabled.                                                        | Fits global seed (admin + the static library).                                                    |
| **P2**   | `public-credential-emitters.spec` (j6)      | `/.well-known/did.json` dual methods; `/ob2/a/<id>` OB2 JSON + the `/c/<id>` HTML→`/public` negotiation, for a PUBLIC accepted claim.                                  | New seed: a PUBLIC accepted claim + a configured keypair.                                         |
| **P2**   | `passkey-register-and-login.spec` (j8)      | Register a passkey + usernameless login. **Needs a CDP virtual authenticator** (`context.addInitScript` / `CDPSession` `WebAuthn.addVirtualAuthenticator`).            | New seed + virtual authenticator.                                                                 |
| **P2**   | `superadmin-2fa-and-site-suspend.spec` (j9) | Superadmin email+passkey 2FA login; cross-org report read; SITE suspend; org admin can't lift. **High-setup.**                                                         | New: a second org + `SUPERADMIN_ORG_ID` + a superadmin passkey. Likely **manual-until-fixtured**. |
| **P2**   | `api-shape-and-auth.spec` (j10)             | `GET /api/v1/achievements`, `/achievementClaims` (membership gate + `profileLinkable`), `POST /api/v1/reports`, webauthn endpoints — shapes + 401/403.                 | Fits global seed; some already unit-covered.                                                      |

**Manual-only (don't automate now):** backpack / CHAPI wallet (browser credential handler
is impractical headless) — keep as a manual journey-6 step.

## Seed / fixture strategy

The existing seam, `tests/playwright/globals/setup.ts`, creates **one org + one claimable
achievement** per run (org-scoped by domain) and tears it down. New specs need richer
state; recommended approach:

- **Extend the global seed** (or add a shared helper) to optionally provision the ledger
  entities the manual guide uses — a prereq+gated pair, a reviewed badge + steward, a
  membership badge + a member + a non-member, a badge with an image, a PUBLIC accepted
  claim. Mirror the manual **ordering** so a spec can build on a prior fixture rather than
  re-seeding from scratch.
- **Per-spec fixtures** for the heavy/isolated cases (passkey virtual authenticator;
  the second superadmin org + `SUPERADMIN_ORG_ID`), since they need process/env or browser
  capabilities the global seed shouldn't impose on every run.
- **WebAuthn**: drive a **CDP virtual authenticator** (Chromium) — register + usernameless
  login are automatable but involved; gate behind a Chromium-only project.
- **did:web / origin**: specs that touch credentials or passkeys must run on the org's
  configured domain/origin (RP ID), matching the global-setup domain convention.

## Suggested build order for the backlog

1. **P0** `achievement-edit-preserves` — cheap, guards a shipped regression.
2. **P1** `claim-prereq-gating`, `membership-gating`, `report-and-org-suspend`,
   `review-rubric-results` — the core spike boundaries; they can share an extended seed.
3. **P2** `add-skills-onboarding`, `public-credential-emitters`, `api-shape-and-auth` —
   stable, low-setup.
4. **P2 (high-setup)** `passkey-register-and-login`, then
   `superadmin-2fa-and-site-suspend` — once the virtual-authenticator + superadmin-org
   fixtures exist.

Keep each new spec mapped back to its journey file here so manual and automated coverage
stay in sync.
