# Cross-environment e2e test architecture

- Status: Accepted
- Date: 2026-06-06
- Deciders: ORCA maintainers

## Context

We are growing the Playwright suite (`pnpm test:e2e`) to cover the app's
critical user paths (creating/awarding/claiming/endorsing achievements, login
and registration, viewing the achievements list). The same suite should
eventually run not only locally but against deployed Vercel preview
environments, each backed by a per-deployment Neon database branch.

ORCA is multi-tenant: the org is resolved from the request `Host`
(`src/hooks.server.ts`). Tests must therefore provision an org whose `domain`
matches a host they can address, seed prerequisite data (users, sessions,
achievements, claims), and read back values the UI cannot expose directly (the
login OTP in `Session.code`, the invite token in `ClaimEndorsement`).

The central tension: data setup/readback must work both when the test runner is
co-located with the database (local) and when the app runs remotely (preview).
The obvious "test-control HTTP endpoint in the app" would let CI seed data over
HTTP, but shipping such an endpoint means shipping the ability to forge sessions
and log in as any user into a deployed, internet-reachable surface.

## Decision

1. **All test data setup/readback goes through a single `testControlService`
   seam** (`tests/playwright/support/testControlService.ts`): an interface free
   of Prisma types, with a Prisma-backed implementation. Specs never touch
   Prisma directly.
2. **The implementation seeds via direct Prisma access from the test process**,
   not via an in-app HTTP endpoint. There is intentionally **no test-control
   endpoint in the deployed app**. For remote runs, a Prisma client in CI
   connects directly to the same database branch the preview app uses, via a
   least-privilege CI credential held in CI secrets — keeping the
   session-forgery capability out of the deployed surface.
3. **Per-run org isolation by host.** Each spec/run provisions its own org whose
   `domain` is a host it can address: locally a unique `crit-<label>.localhost`
   (Vite `allowedHosts: true`); remotely the preview deployment host. Cookies
   key to the host without the port.
4. **Local data lives in a dedicated, reset-able schema** (`orca_test` via
   `.env.test`), never the developer's working schema. Each spec cleans up its
   org in teardown.
5. **The seam preserves a swap path.** Because everything routes through the
   interface, a future `HttpTestControlService` (M4) — or a different local
   backing store — is a configuration change, not a spec rewrite. Secrets/codes
   (OTP, invite token) are read back through the service, so no email capture or
   in-app "peek" endpoint is needed.

## Consequences

- The deployed app never exposes privileged test-control capabilities; the
  blast radius of the seeding capability is confined to CI credentials.
- The test runner and the app under test MUST point at the same database
  (locally the same `orca_test` schema; remotely the same Neon branch), or
  seeded data won't be visible to the app. This is a hard requirement for M3.
- Specs are portable across local and remote by construction; only the service's
  connection target and the org host derivation change between environments.
- Production smoke testing is deferred: the only safe production-facing option
  is a future, narrowly-scoped HTTP control impl (or read-only checks). That
  decision is out of scope here and revisited in M4.
- A standing constraint: any future change that adds an in-app test/seed
  endpoint, or lets the seeding path reach a non-preview/production database,
  contradicts this decision and requires a new ADR.
