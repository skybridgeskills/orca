# 00 — Setup

Stand up a local environment once, create the QA accounts, then run journeys 01–10 in
order without resetting. (See the [README](./README.md) for how the guide works.)

## Base environment

Follow the repo [`README.md`](../../README.md) "Getting started" steps; the essentials:

- [ ] **Database**: Postgres reachable (the repo's `docker compose up -d` works). Create the
      app schema (`orca_public`) and, for e2e, `orca_test` — per the README SQL.
- [ ] **Env**: `cp .env.example .env`; set `DATABASE_URL`, `PUBLIC_HTTP_PROTOCOL="http"`,
      and `DEFAULT_ORG_DOMAIN="localhost:5173"` (with `DEFAULT_ORG_ENABLED` per your
      preference). Leave `MAILGUN_API_KEY` unset/`none` for dev (see "Reading login codes").
- [ ] **Migrate**: `pnpm install` then `pnpm run migrate:dev`.
- [ ] **Create the org**: `pnpm run createOrganization` — set the domain to `localhost:5173`
      (no `http://`; must match `DEFAULT_ORG_DOMAIN`). This is the **primary org** for the
      run-through.
- [ ] **Create the admin**: `pnpm run createAdmin` → this is the **_Admin_** account (an
      email you control / can read codes for).
- [ ] **Create the issuer keypair**: `pnpm run createKeypair` — required before credentials
      can be signed (journey 6).
- [ ] **Run**: `pnpm run dev` → http://localhost:5173.

## Reading login codes (dev)

ORCA login is a magic-link **6-digit code** emailed to the user. In dev (no real Mailgun),
the mailer uses a JSON transport and the message — including the code — is printed to the
**server console** running `pnpm run dev`. To log in as any account during QA, submit the
email on `/login`, then read the code from the dev server terminal. (If you set a real
`MAILGUN_API_KEY`, codes go to the real inbox instead.)

## Media (image upload)

Logo/badge image upload (journeys 1–3) writes to the local `dev-uploads/` directory by
default — no extra setup. (Localstack S3 is only needed if specifically testing the S3
path; see the README "Media Storage" section.)

## QA accounts

| Account       | How created                                                  | Used in       |
| ------------- | ------------------------------------------------------------ | ------------- |
| _Admin_       | `createAdmin` on the primary org                             | 1–3, 5, 9, 10 |
| _Member user_ | self-registers by claiming _Member_ in journey 4             | 4, 6, 7, 8    |
| _Invitee_     | a second email you control; registers via invite (journey 5) | 5, 7          |
| _Superadmin_  | optional track below                                         | 9             |

Use email addresses whose codes you can read (any address works in dev since codes are
logged to the console).

## Optional track A — superadmin org (for journey 9 cross-org moderation + 2FA)

Content reporting notifies, and superadmins moderate from, a dedicated **superadmin org**.
To exercise the SITE-tier / cross-org parts of journey 9:

- [ ] Create a **second** organization (`pnpm run createOrganization`, a different domain,
      e.g. `super.localhost:5173` — or reuse `localhost:5173` only if you understand it must
      be a distinct org row; a distinct domain is cleaner).
- [ ] Set **`SUPERADMIN_ORG_ID`** in `.env` to that org's id, then restart `pnpm run dev`.
- [ ] Provision a **_Superadmin_** admin user **in that org**: `pnpm run createAdmin` and
      select the superadmin org (the script gained an org selector). This org should not be
      a customer-facing org.

See ADR [`../adr/2026-06-13-superadmin-org-boundary.md`](../adr/2026-06-13-superadmin-org-boundary.md).
When `SUPERADMIN_ORG_ID` is unset, journey 9 still covers the **org-admin** (ORG-tier)
moderation path — the cross-org/SITE/2FA steps are simply skipped.

## Optional track B — passkeys (for journey 8 and the 2FA in journey 9)

Passkeys (WebAuthn) are bound to the org domain (the RP ID). To register and use one in QA:

- [ ] Use a **platform authenticator** (Touch ID / Windows Hello) on a supported browser,
      **or** a **virtual authenticator**: Chrome DevTools → **WebAuthn** tab → "Enable
      virtual authenticator environment" → add an authenticator (e.g. internal, resident
      keys + user verification supported).
- [ ] Confirm the app is reached at the same origin the passkey is registered for
      (`http://localhost:5173`).

See ADR [`../adr/2026-06-13-passkey-webauthn-auth.md`](../adr/2026-06-13-passkey-webauthn-auth.md).

## Reset / teardown

- A clean run = a fresh database (drop/recreate `orca_public` + `pnpm run migrate:dev`, then
  re-run `createOrganization`/`createAdmin`/`createKeypair`). Useful when you want to repeat
  the full ordered run from scratch.
- `pnpm run purgeMessages` clears notification `Message` rows if they accumulate.
- **Within a run, do not reset** — later journeys depend on earlier state (that's the
  ledger).

Once setup is complete, start with **[01-org-setup.md](./01-org-setup.md)**.
