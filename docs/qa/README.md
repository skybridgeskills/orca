# ORCA QA guide

A manual, **state-ordered** run-through of ORCA. Work top to bottom: each journey reuses
state (orgs, badges, users, claims) produced by earlier journeys, so a single pass
exercises the whole app efficiently. Tick the `- [ ]` boxes as you go. **Do not reset the
database between journeys** — that's the whole point of the ordering.

This guide targets recently rapidly developed features, which added a lot at once
(review stewards + notifications, rubrics & results, the "This badge" requirement,
DataIntegrityProof / eddsa-rdfc-2022 credentials, durable-skills onboarding, membership
gating, content reporting & moderation + a superadmin org, and passkeys + superadmin 2FA),
on top of the existing org/auth, achievement authoring, claiming/invites/reviews,
credentials, members, OAuth, and API surfaces.

## How to use

1. Do the setup once: **[00-setup.md](./00-setup.md)** (environment, accounts, and the
   optional superadmin + passkey tracks).
2. Run the journeys in order (01 → 10). Each file states its **preconditions** (state from
   earlier journeys), then numbered checkable steps with **expected results**, then the
   **state it produces** (named entities later journeys reuse), then an **e2e candidate**
   call-out.
3. When something doesn't match the guide, **record what the app actually did** and file
   it — this guide is also a bug-finding tool.
4. When done, see **[automation.md](./automation.md)** for which journeys to turn into
   Playwright e2e tests and how.

## The journey ledger

The ordering is designed so the **Produces** column of one row supplies the **Consumes**
column of a later one. Named entities (in _italics_) are referenced by these exact names
across the journey files.

| #   | Journey                                                     | Consumes (prior state)                                    | Produces (named entities)                                                                                            | e2e priority |
| --- | ----------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | [Org setup](./01-org-setup.md)                              | _Admin_ (from setup)                                      | Org configured (branding, issuer); permissions wired                                                                 | P1           |
| 2   | [Achievement authoring](./02-achievement-authoring.md)      | Org configured                                            | _Category_; badges _Member_, _Prereq_, _Gated_, _Reviewed_, _Invite-only_, _Competency_; `membershipAchievement` set | P1           |
| 3   | [Edit & regressions](./03-edit-and-regressions.md)          | The authored badges                                       | (validates; no new state)                                                                                            | P0           |
| 4   | [Claiming](./04-claiming.md)                                | _Member_, _Prereq_, _Gated_                               | _Member user_; valid _Member_/_Prereq_/_Gated_ claims                                                                | P1           |
| 5   | [Invites, awards & reviews](./05-invites-awards-reviews.md) | _Invite-only_, _Reviewed_, stewards                       | _Invitee user_; a valid reviewed claim with rubric results; endorsements                                             | P1           |
| 6   | [Credentials](./06-credentials.md)                          | Any valid claim; issuer (j1)                              | (validates issuance; no new state)                                                                                   | P2           |
| 7   | [Membership & visibility](./07-membership-visibility.md)    | `membershipAchievement`, _Member user_, a non-member      | Visibility states exercised                                                                                          | P1           |
| 8   | [Settings & passkeys](./08-settings-and-passkeys.md)        | _Member user_; passkey authenticator (setup)              | _Member user_ has a passkey                                                                                          | P2           |
| 9   | [Reporting & moderation](./09-reporting-moderation.md)      | Content from j2–j5; _Superadmin_ + superadmin org (setup) | Suspended content; moderation actions                                                                                | P1           |
| 10  | [OAuth & API](./10-oauth-and-api.md)                        | _Admin_; an achievement                                   | OAuth clients/tokens (validates)                                                                                     | P2           |

## Conventions used by every journey file

Each journey file follows the same shape so the run-through stays predictable:

- **Preconditions** — the prior-journey state it needs (by the ledger's entity names), and
  which **actor** performs it (_Admin_, _Member user_, _Invitee_, _Superadmin_, or an
  anonymous/public visitor). Steps that need an **optional setup track** (superadmin org or
  passkeys) are marked.
- **Steps** — numbered `- [ ]` checkboxes, each naming the **route** (e.g.
  `/achievements/create`), the action, and the **expected result**.
- **State produced** — the named entities a later journey reuses.
- **e2e candidate** — yes/no, **priority** (P0 critical-regression, P1 high-value, P2
  nice-to-have), and a **seam note**: does an automated version fit the existing
  `tests/playwright/globals/setup.ts` seed (one org + one claimable achievement, scoped by
  domain) or need a new seed/fixture? See [automation.md](./automation.md).
- **Citations** — links to the relevant ADR under [`../adr/`](../adr/) and the route(s).

Surface labels: **admin-only**, **member-only**, **public** (works logged-out). Where a
button label matters, the guide quotes it.

## Scope & non-goals

In scope: a full functional run-through of the web app + public credential emitters + API
spot-checks, with the spike features prioritized. Out of scope: load/performance,
accessibility audit, and security penetration testing (separate efforts). Automated test
**authoring** is recommended here but performed later (see automation.md).
