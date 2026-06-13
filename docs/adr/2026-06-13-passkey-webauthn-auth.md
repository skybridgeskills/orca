# Passkey (WebAuthn) authentication

- Status: Accepted
- Date: 2026-06-13
- Deciders: ORCA maintainers

## Context

ORCA authenticated users only via a magic-link email code. We want passkeys (WebAuthn)
as an additional method for all users, and — as the moderation fast-follow — to harden
the dedicated superadmin org with a second factor. An incomplete prior PR (#27, on the
old SvelteKit-4 branch) chose good libraries but was insecure (hardcoded `localhost` RP,
no server-side challenge, server verification importable from the client, stubbed
authentication, no signature counter). We reuse the libraries and rebuild the logic.

## Decision

1. **Libraries:** `@simplewebauthn/server` + `@simplewebauthn/browser` (v13). All
   verification lives in a **server-only** module (`src/lib/server/webauthn/`);
   `@simplewebauthn/browser` is imported only in `.svelte` components.

2. **Credentials are stored as `Identifier` rows** (`type=PASSKEY`; `identifier` =
   credentialId; a new `Identifier.json` holds `{ publicKey (base64url), counter,
transports, deviceType, backedUp, label, lastUsedAt }`). This advances a future
   **unified identifier model** (wallet-based identifiers later become new types) rather
   than a dedicated authenticator table. PASSKEY identifiers are authenticators, never
   contact/identity — they are excluded from all identity displays and
   identifier-visibility settings.

3. **Per-org-domain RP ID.** ORCA is multi-org by domain, so the WebAuthn RP ID is the
   org's domain (hostname, no port) and the expected origin is the full request URL,
   derived per request — never hardcoded. A passkey is bound to one org's domain,
   consistent with ORCA's per-org `User` rows.

4. **Challenge stored on the `Session` row** (`passkeyChallenge` +
   `passkeyChallengeExpiresAt`), single-use (cleared on consume) and short-TTL — closing
   the replay hole. Registration stores it on the logged-in user's session;
   authentication on a cookie-bound pre-auth session (created `valid:false`, activated on
   success). The signature **counter** is persisted on every assertion (clone detection).

5. **Login model.** Normal orgs: a passkey alone (usernameless/discoverable) OR an email
   code alone — either single factor. **Superadmin org** (`SUPERADMIN_ORG_ID`): when the
   user has ≥1 passkey, the email code is only the first factor — the session records
   `emailVerifiedAt` and is **not** activated until a passkey assertion completes at
   `…/webauthn/2fa/verify`. The two factors are bound to the same cookie session; neither
   can be skipped (2FA verify requires `emailVerifiedAt`) or swapped (the asserted
   credential must belong to the session's user). A superadmin with no passkey logs in
   with email alone.

## Consequences

- Additive migration: `IdentifierType.PASSKEY`, `Identifier.json`, three nullable
  `Session` columns (`passkeyChallenge`, `passkeyChallengeExpiresAt`, `emailVerifiedAt`).
  Non-destructive.
- A passkey works only on the org domain it was registered for; the same human in two
  orgs registers separately (matches per-org users).
- The superadmin org now supports real 2FA, materially hardening the cross-org
  moderation capability introduced by the reporting-moderation plan.
- WebAuthn ceremonies can't run headlessly in unit tests without a virtual authenticator;
  the pure pieces (RP derivation, codec, single-use challenge, the 2FA decision) are
  unit-tested and the `@simplewebauthn` verify boundary is mocked; full-ceremony coverage
  relies on manual/dev smoke.

## Alternatives considered

- **Dedicated authenticator table** (typed `publicKey Bytes`, `counter Int`). Rejected in
  favor of the `Identifier` reuse to advance the unified-identifier goal; the mutable
  counter living in `json` is an accepted minor tradeoff.
- **Shared-root RP ID** (one registrable root, cross-subdomain). Rejected: breaks for
  custom org domains and implies cross-org credential sharing (conflicts with per-org users).
- **Separate challenge table.** Rejected: the cookie-bound `Session` already models the
  pre-auth/partial-auth state cleanly; a single-use field there is sufficient.
- **2FA for every org once a passkey exists.** Rejected: the requirement scopes mandatory
  second-factor to the superadmin org; elsewhere passkeys are an alternative, not a burden.
