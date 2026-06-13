# 01 — Org setup

**Actor:** _Admin_ · **admin-only** · **Consumes:** _Admin_ (from
[`00-setup.md`](./00-setup.md)) · **Produces:** org configured (branding, issuer);
`editAchievementCapability` permission wired.

Configure the primary org's branding, wire the achievement-editing permission, and confirm
a signing issuer exists. Setup (org, admin, keypair, dev server, reading login codes) is
covered once in [`00-setup.md`](./00-setup.md) — don't repeat it here. See the
[README](./README.md) for how the ordered run works.

> The org's `membershipAchievement` is **not** set here — the _Member_ badge it points to
> doesn't exist yet. It's set at the **end of** [`02-achievement-authoring.md`](./02-achievement-authoring.md)
> once _Member_ has been authored. This file only wires branding + the
> `editAchievementCapability`.

## Preconditions

- [ ] You are logged in as the **_Admin_** of the primary org (`localhost:5173`). Log in via
      `/login` and read the 6-digit code from the dev server console (see `00-setup.md`).

## Steps

### Branding round-trip (`/about/edit` → `/about`)

1. - [ ] Go to **`/about/edit`**. The org edit form loads pre-filled with the current values.
2. - [ ] Set **Name**, **Description**, **Website URL** ("Url"), **Tagline**, **Default
         language** (a select; leave blank for "no default" or pick e.g. English (US)), and
         **Primary color** (a color picker).
3. - [ ] Under the logo field ("Logo"), drag/drop or choose a **PNG or SVG** image. A preview
         renders in the drop zone. (Uploads go to local `dev-uploads/` by default — see
         `00-setup.md` "Media".)
4. - [ ] Click **Submit**. Expected: the page hard-reloads to **`/about`** (the form does a
         `window.location.replace('/about')` so the header picks up the new branding).
5. - [ ] On **`/about`**, confirm the new **name, tagline, description, and logo** render.
6. - [ ] Confirm the **nav header** shows the updated org name/logo and that the **primary
         color** is applied to themed UI.
7. - [ ] Re-open **`/about/edit`**: confirm every field round-tripped (the logo still shows in
         the drop zone, color/language preserved). Editing text only and re-submitting must
         **not** drop the logo.

### `editAchievementCapability` permission

This is the "Permissions" section of `/about/edit`. It controls who may create/edit
achievements (the gate enforced by `canEditAchievements`, consumed by `/achievements/create`
and `/achievements/[id]/edit`). Cite ADR
[`../adr/2026-06-09-achievement-config-merge.md`](../adr/2026-06-09-achievement-config-merge.md)
for the achievement model and
[`../adr/2026-06-12-membership-achievement-gating.md`](../adr/2026-06-12-membership-achievement-gating.md)
for the parallel `membershipAchievement` permission shape.

8.  - [ ] In **`/about/edit`** scroll to **Permissions** → "Who can create and edit
          achievements". Two radio options: **"Only administrators"** and **holders of a chosen
          badge** ("Holders of a specific achievement"). Default/expected for a fresh org:
          **Only administrators**.
9.  - [ ] Leave it on **Only administrators** for the run-through (later journeys assume the
          _Admin_ authors badges). Click **Submit** → reloads to `/about`.
10. - [ ] (Optional probe) Re-open `/about/edit`, select the **badge-holder** option and click
          **Choose...** to open the achievement picker. Expected: a badge can be selected and
          the requirement persists; selecting the badge-holder radio with **no** badge falls
          back to "Only administrators". **Revert to "Only administrators" and Submit** before
          continuing so the rest of the guide is consistent.

> ⚠️ note: the **Membership** section ("How is membership determined") also appears on this
> page with the same admin-vs-badge shape. Per the P1 review decision we leave it on **Only
> administrators** for now and set it to _Member_ at the end of journey 02 — do **not** set it
> here.

### Issuer / signing key (`/about/settings/issuer`)

This is a prerequisite for credential signing in [`06-credentials.md`](./06-credentials.md).

11. - [ ] Go to **`/about/settings/issuer`**. Under **Issuer**, the signing key created by
          `pnpm run createKeypair` (see `00-setup.md`) appears as a **"Sign locally — Key …"**
          radio option, selected by default.
12. - [ ] Confirm **no** "previously selected signing key … is no longer available" warning is
          shown (that banner means the active key is missing — re-run `createKeypair` if so).
13. - [ ] Leave **"Sign locally"** selected and click **Save issuer**. Expected: saves without
          error. (The **"Wallet exchange via Transaction Service"** option is disabled unless a
          transaction-service URL/tenant/API key is configured — not needed for QA.)

## State produced

- The primary **org is configured** (branding visible on `/about` + nav).
- **`editAchievementCapability` = Only administrators** (admins author badges in 02).
- A **signing issuer is selected** and ready for journey 06.
- (`membershipAchievement` is still unset — set at the end of journey 02.)

## e2e candidate

- **Branding round-trip** — yes, **P2** (nice-to-have; low-churn config). Seam note: needs a
  new fixture (logo upload + `/about` assertion); doesn't fit the existing
  `tests/playwright/globals/setup.ts` seed (one org + one claimable achievement).
- **Permissions config (`editAchievementCapability`)** — yes, **P1**: it gates who can author
  badges in every later journey. The existing `critical/` specs already assume an admin
  exists, so an e2e here would assert the admin-vs-badge gate specifically, which needs a
  second (non-admin) user fixture.

## Citations

- Routes: [`/about/edit`](../../src/routes/about/edit),
  [`/about`](../../src/routes/about),
  [`/about/settings/issuer`](../../src/routes/about/settings/issuer).
- ADRs: [`../adr/2026-06-09-achievement-config-merge.md`](../adr/2026-06-09-achievement-config-merge.md),
  [`../adr/2026-06-12-membership-achievement-gating.md`](../adr/2026-06-12-membership-achievement-gating.md).

Next: [`02-achievement-authoring.md`](./02-achievement-authoring.md).
