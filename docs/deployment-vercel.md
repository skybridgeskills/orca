# Deploying ORCA to Vercel (Node 24)

This runbook covers a **production** deployment of ORCA to Vercel on the Node.js 24
runtime, including releases that ship Prisma schema migrations. It is written for an
operator with Vercel and Neon access who may not know ORCA internals. Use the
imperative steps and copy-paste commands as-is.

## 1. Overview

- ORCA on Vercel builds with `@sveltejs/adapter-vercel` and runs on the
  `nodejs24.x` runtime. The runtime is pinned explicitly in `svelte.config.js`
  (`runtime: 'nodejs24.x'`) for the `VERCEL=1` build path.
- **The Vercel build never touches the database.** [`vercel.json`](../vercel.json)
  sets `"buildCommand": "pnpm run build"`. Production migrations are applied **by
  hand**, before Promote, by starting the **Migrate database** GitHub Actions
  workflow (section 4). See ADRs `2026-10-09-manual-production-migrations` and
  `2026-10-23-production-migrations-workflow`.
- A push to the production branch creates a **staged** Production deployment,
  built with the Production environment variables. **Promote** assigns the
  production domains to it without rebuilding. Environment variables are fixed
  when a deployment builds, so change them before the build you want them in.
- Preview builds never migrate their databases either.
- The Docker deployment path is separate and unchanged: its entrypoint still runs
  `prisma migrate deploy` when the container starts.
- At runtime, ORCA uses the Neon serverless driver when `DATABASE_SERVERLESS=true`.
  Migrations use the **direct** (non-pooled) connection.

## 2. Prerequisites checklist

- [ ] The merge target (`main` for production) includes the Node 24 config
      (`.nvmrc` = `24`, `svelte.config.js` runtime `nodejs24.x`, `vercel.json`).
- [ ] Vercel project is connected to the `orca` repo and the correct production branch.
- [ ] Neon production branch is accessible; if the release changes the schema, the
      migration SQL under `src/prisma/migrations/` has been reviewed.
- [ ] Vercel **Production** environment variables are set (from `.env.example`; at minimum):
  - `DATABASE_URL` — Neon **pooled/serverless** connection (app runtime).
  - `DATABASE_URL_DIRECT` — Neon **direct** connection (migrations).
  - `DATABASE_SERVERLESS=true`
  - `PUBLIC_HTTP_PROTOCOL=https`
  - `USE_SECURE_COOKIES=true`
  - Mail vars as used in production: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`,
    `MAILGUN_HOST` (or `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` /
    `SMTP_SECURE`).
  - S3/media vars as used: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
    `S3_BUCKET_NAME`, `S3_REGION`, `S3_URL`, `PUBLIC_MEDIA_DOMAIN`.
  - Optional: `SUPERADMIN_ORG_ID` (the superadmin org; see
    `docs/adr/2026-06-13-superadmin-org-boundary.md`).
  - Optional: `ORG_CONFIG_ENCRYPTION_KEY` (32 random bytes, base64; see `.env.example`).
    Needed only if an org uses the transaction-service issuer: it encrypts that org's
    API key. Without it, saving a transaction-service API key on the issuer settings
    page fails with a 500.
  - Optional: `CRON_SECRET`. Vercel Cron sends it as
    `Authorization: Bearer <CRON_SECRET>` to `/api/cron/purge-messages`, daily at
    03:00 UTC (the `crons` entry in `vercel.json`). The job purges old messages and
    Send to wallet exchanges that expired more than 24 hours ago. Without it, the
    cleanup job gets a 401 and nothing is purged.
- [ ] Vercel project settings: **Node.js Version 24.x**; `ENABLE_EXPERIMENTAL_COREPACK=1`
      in Production and Preview (needed for pnpm 11); no build or install command
      overrides in the dashboard (`vercel.json` is the source of truth).
- [ ] A GitHub environment for each production database, for the **Migrate
      database** workflow (one-time; see "GitHub environments for migrations"
      below).
- [ ] Only for the local fallback in section 4: Node 24 and pnpm (via
      `corepack enable`); `node -v` reports `v24.x`.
- [ ] A PostgreSQL 15+ client (`pg_dump`) if you take a dump backup.

### GitHub environments for migrations

The **Migrate database** workflow (`.github/workflows/migrate.yml`) migrates the
database of whichever GitHub environment you choose when you start it. It lists
the repository's environments in a dropdown, so the workflow itself names none.
Set up one environment per production database (Skybridge uses `production-us`
and `production-eu`; any names work):

1. In the GitHub repository, open **Settings → Environments → New environment**
   and name it.
2. Under **Environment secrets**, add `DATABASE_URL_DIRECT` with that database's
   Neon **direct** (non-pooled) connection string. The workflow uses it for both
   `DATABASE_URL` and `DATABASE_URL_DIRECT`.
3. Under **Deployment branches and tags**, choose **Selected branches and tags**
   and add only `main`. **This is required:** without it, anyone with write
   access could start the workflow from another branch and apply that branch's
   migrations to production.
4. Optional: add **Required reviewers** so each run waits for an approval.

Each run is recorded under the environment's deployment history, which serves as
the log of production migrations.

## 3. Set Node.js 24 on Vercel (one-time / verify)

ORCA pins the runtime in the repo, but confirm the dashboard agrees:

**Repo (authoritative):**

- `svelte.config.js` sets `runtime: 'nodejs24.x'` for the `VERCEL=1` path.

**Dashboard (verify it aligns):**

- Vercel project **Settings → General → Node.js Version → 24.x**. The dashboard
  setting governs the build environment; keep it at 24.x so build and runtime match.

**After deploy, verify:** the Vercel build logs report Node `24.x`, and the deployed
functions show the `nodejs24.x` runtime.

### Node.js security releases

- Vercel manages the patch version for `nodejs24.x`. Do **not** change the project's
  Node.js Version setting or `svelte.config.js` for a patch release.
- Watch Vercel's Node.js security bulletin until it reports the patched runtimes as
  fully rolled out. Then redeploy **both** production projects (US and EU) through the
  normal release flow (sections 4–6; skip the migration step if the schema is
  unchanged).
- Verify: load a page in each project, then find the `orca server start` line in its
  function logs. Confirm `node` is at or above the patched version (for example
  `v24.22.1` for the October 2026 release). The line is logged on cold start.
- Docker is separate: the `Dockerfile` uses the floating `node:24-alpine` tag and CI
  pulls it fresh, so any new image built on `main` gets the latest Node 24 patch.
  The published image only changes when `main` is rebuilt; re-run the latest `main`
  CI workflow if nothing has merged since the release.

## 4. Deploying a release with migrations

For a release that adds files under `src/prisma/migrations/`:

1. **Merge** the code to the production branch (`main`). Vercel builds a **staged**
   Production deployment. Wait for it to finish building, but **do not promote yet**.
2. **Back up the production database.** Take a Neon snapshot, and/or a dump with a
   PostgreSQL 15+ client:
   ```bash
   pg_dump -Fc --no-owner "$DIRECT_URL" -f orca-$(date -u +%Y%m%dT%H%M%SZ).dump
   ```
   The migration run's summary records its UTC start time, which is the
   point-in-time restore target if you have to roll back.
3. **Run the migrations.** In GitHub, open **Actions → Migrate database → Run
   workflow**. Keep the branch at `main`, choose the database's environment, and
   leave `sha` empty. Or from a terminal:

   ```bash
   gh workflow run migrate.yml --ref main -f environment=production-us
   ```

   In the run's log, the **Migration status** step should list exactly the
   release's new migrations as pending; **Apply migrations** then applies them in
   order. The run summary shows the commit and the UTC start time.

   Set `sha` only when `main` has moved past the staged build and the newer
   commits add migrations that must not go out yet. Give the staged build's
   commit; the run checks out that commit and refuses one that is not on `main`.

4. **Promote** the staged deployment straight away.

For several production deployments (Skybridge runs US and EU, each with its own
database), repeat steps 2–4 for each one.

**Fallback: run from a local checkout.** If GitHub Actions is unavailable, apply
step 3 by hand from a checkout of the merged commit. In that shell, set **both**
`DATABASE_URL` and `DATABASE_URL_DIRECT` to the production **direct**
(non-pooled) connection string. Shell variables take precedence over any local
`.env`. Record the UTC timestamp yourself just before migrating.

```bash
pnpm exec prisma migrate status --schema src/prisma/schema.prisma
pnpm exec prisma migrate deploy --schema src/prisma/schema.prisma
```

Between steps 3 and 4 the live (old) code runs against the new schema. For an
additive migration that is harmless. For a breaking one (a dropped or renamed
table or column), it is a short outage, so keep the gap as short as you can.

If you forget step 3, the new deployment fails as soon as it touches a new column
or table. Run step 3, and it recovers without a redeploy.

## 5. Deploy when there are no migrations

1. Merge the code to the production branch.
2. Check the staged Production deployment (build logs; open its URL).
3. Promote it.

## 6. Post-deploy verification

- [ ] Request `/healthz` on the production URL; expect a healthy response.
- [ ] Load the app root and complete one authenticated smoke flow (log in).
- [ ] Check Vercel function logs for Prisma/Neon connection errors.
- [ ] If the schema changed, confirm the new columns/tables are present via the app
      UI or a read-only SQL query against the Neon production branch.

## 7. Rollback

- **App code:** use Vercel **Instant Rollback** to the previous good deployment.
- **Schema:** Instant Rollback does not undo migrations, and Prisma migrations are
  **forward-only**. If a migration already ran and the old code can't run on the
  new schema, also **restore the database**: a Neon point-in-time restore to the
  "Started (UTC)" time in the migration run's summary (or the timestamp you
  recorded for a local fallback run), or the snapshot or dump. For a fix that keeps
  the new schema, write a new forward migration instead.
- **Never** run `prisma migrate reset` against production; it drops all data.

## 8. Local Vercel bundle reproduction

Reproduce the Vercel build locally on Node 24 before deploying:

```bash
rm -rf build .svelte-kit .vercel
set -a && source .env && set +a
VERCEL=1 pnpm run build
```

Expect `.vercel/output/` with function `.vc-config.json` files reporting
`"runtime": "nodejs24.x"`. This is the same build Vercel runs.

## 9. Troubleshooting

| Symptom                                                                     | Likely cause                                           | Fix                                                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `Unsupported Node.js version`                                               | Build/runtime on old Node                              | Set project Node.js Version to 24.x; confirm `runtime: 'nodejs24.x'` in `svelte.config.js` |
| Install fails on the pnpm version                                           | Corepack not enabled                                   | Set `ENABLE_EXPERIMENTAL_COREPACK=1` in the environment; redeploy                          |
| Runtime Prisma/Neon errors                                                  | `DATABASE_SERVERLESS` not `true`                       | Set `DATABASE_SERVERLESS=true`; redeploy                                                   |
| New deployment 500s on new columns/tables                                   | Migrations not applied                                 | Run section 4 step 3                                                                       |
| Migrate run fails: `Environment '…' has no DATABASE_URL_DIRECT secret`      | Wrong environment chosen, or its secret is missing     | Pick the right environment, or add the secret (section 2, GitHub environments)             |
| Migrate run fails: `… is not on main`                                       | `sha` is not a commit on `main`                        | Use the staged build's commit from `main`, or leave `sha` empty                            |
| Migrate run rejected by the environment's protection rules                  | Started from a branch other than `main`                | Start the run on `main`; set `sha` to migrate from an earlier `main` commit                |
| App returns 500 after migrating                                             | `DATABASE_URL` pooled string misconfigured             | Verify the Neon **pooled** connection string                                               |
| Message cleanup cron returns 401                                            | `CRON_SECRET` missing from Production env              | Set `CRON_SECRET`; redeploy so the build picks it up                                       |
| `orca server start` logs an unpatched Node version after a security release | Vercel rollout not complete, or deployment predates it | Wait for Vercel's bulletin to report completion; redeploy                                  |

## Review gate (before production deploy)

A human confirms, before executing the production deploy:

1. The steps above match the actual Vercel project name and settings.
2. The production env-var list is complete for this deployment.
3. For a release with migrations: a backup has been taken, and the restore timestamp
   is known (the migration run's summary records it).
