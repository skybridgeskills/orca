# 08 — Settings & passkeys

User settings round-trip (visibility + email preference) and the **passkey** (WebAuthn)
lifecycle: register, list, rename, delete, and usernameless login. See the
[README](./README.md) for conventions and [`00-setup.md`](./00-setup.md) for accounts and
the **passkey track**. Do not reset between journeys.

ADR: [`../adr/2026-06-13-passkey-webauthn-auth.md`](../adr/2026-06-13-passkey-webauthn-auth.md).

## Preconditions

- **_Member user_** (journey 4, [`04-claiming.md`](./04-claiming.md)), logged in.
- For the passkey steps: the **optional passkey track** from
  [`00-setup.md`](./00-setup.md) — a platform authenticator (Touch ID / Windows Hello) **or**
  a Chrome DevTools **virtual authenticator** (WebAuthn tab → enable virtual authenticator,
  internal + resident keys + user verification). The passkey is bound to the org domain
  (`localhost:5173`), so reach the app at exactly that origin.

> 🔑 **Passkey-track dependency:** steps B–C below require the authenticator. If the track
> is skipped, do steps A only; the passkey table will be empty and "Add a passkey" will fail
> the browser ceremony.

## Steps

### A. Visibility + email-preference round-trip (actor: _Member user_)

1. - [ ] Go to **`/settings`**. Confirm the form shows your given/family name, an
         **Identifiers** table (your EMAIL identifier; visibility select), a **Profile**
         visibility select, a **Badges and Credentials** default-visibility select, and an
         **email-notification** checkbox.
2. - [ ] Change **Profile visibility** (`profileVisibility`) to a new value, **Identifier
         visibility** to a new value, **Default visibility** (`defaultVisibility`) to a new
         value, and toggle the **email-notifications** checkbox. Click **Save**.
3. - [ ] **Reload** `/settings`. Expected: every changed value **persists** (the form
         re-renders with the saved selections; the email-notification checkbox reflects the
         saved preference).
4. - [ ] Confirm the two visibility fields are **independent**: `profileVisibility` governs
         the member-directory/profile (journey 7); `defaultVisibility` governs **claim**
         visibility — changing one does not change the other.
5. - [ ] Restore **Profile visibility = Community** before journeys 9–10 so the member stays
         visible.

### B. Passkey register / list / rename / delete (actor: _Member user_; **passkey track**)

6. - [ ] On `/settings`, scroll to the **Passkeys** section. With no passkeys yet it shows
         an empty state. Click **"Add a passkey"**, enter a **label** (e.g. "QA virtual
         key"), confirm. The browser runs the WebAuthn **registration** ceremony against your
         authenticator.
   - Under the hood: `POST /api/webauthn/register/options` (challenge stored on your
     session) → browser `startRegistration` → `POST /api/webauthn/register/verify`.
7. - [ ] After success, the **Passkeys** table lists the new credential with: **Label**,
         **Device** (device type, may show "—"), **Added** (date), **Last used** ("Never"
         until first auth). Confirm the row appears.
8. - [ ] Click **Rename**, edit the label inline, **Save**. Expected: the label updates in
         place (form action `?/renamePasskey`, scoped to your user + org + PASSKEY type).
9. - [ ] Click **Delete** on the passkey row. Expected: the row is removed (form action
         `?/deletePasskey`). Re-add one before section C if you deleted your only key.

### C. Passkey is NOT a contact identifier / not on the profile (actor: _Member user_)

10. - [ ] Still on `/settings`, confirm the **Identifiers** table (contact identifiers) does
          **NOT** list the passkey — it shows only your EMAIL (PASSKEY rows are filtered out of
          the contact table and the identifier-visibility control).
11. - [ ] Open your **member profile** `/members/[id]` (your own id). Confirm the
          **Identifiers** section there does **NOT** show the passkey (the profile query
          excludes `type: 'PASSKEY'`). Passkeys are authenticators, never contact/identity.

### D. Usernameless passkey login (actor: _Member user_; **passkey track**)

12. - [ ] **Log out**. Go to **`/login`**.
13. - [ ] Click **"Sign in with a passkey"** (the secondary button, no email typed).
          The browser runs a **discoverable-credential** authentication ceremony.
      - Under the hood: `POST /api/webauthn/authenticate/options` → browser
        `startAuthentication` → `POST /api/webauthn/authenticate/verify`.
14. - [ ] Expected: you are **authenticated and navigated** in (to `/` or `$nextPath`) with
          **no email + no 6-digit code** entered. Re-open `/settings` → the passkey's **Last
          used** now shows a date (the signature counter + `lastUsedAt` were persisted).

## State produced

- **_Member user_ now has a passkey** (consumed by the 2FA path in journey 9 **if** that
  user is also a superadmin). If your _Superadmin_ is a **separate** account, register a
  passkey for the **_Superadmin_** here too (log in as _Superadmin_ on the superadmin org,
  repeat section B) so journey 9 can exercise email + passkey 2FA.

## e2e candidate

- **Yes — register + usernameless login = P2.** WebAuthn needs a **virtual authenticator**
  driven via the Chrome DevTools protocol. Playwright can do it (CDP `WebAuthn.enable` +
  `addVirtualAuthenticator`) but it is involved setup; the pure pieces (RP derivation,
  base64url codec, single-use challenge, the 2FA decision) are already unit-tested and the
  `@simplewebauthn` verify boundary is mocked.
- **Seam note:** does not fit the default seed; needs the **virtual-authenticator harness**
  plus a seeded member. Note as a dedicated fixture in [`automation.md`](./automation.md).

## Citations

- ADR: [`../adr/2026-06-13-passkey-webauthn-auth.md`](../adr/2026-06-13-passkey-webauthn-auth.md)
- Routes: `/settings` (`src/routes/settings/+page.{svelte,server.ts}`),
  `/login` (`src/routes/login/+page.svelte`),
  webauthn endpoints under `src/routes/api/[[version]]/webauthn/{register,authenticate}/*`.
