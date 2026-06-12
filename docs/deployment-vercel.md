# Deploying ORCA to Vercel (Node 24)

This runbook covers a **production** deployment of ORCA to Vercel on the Node.js 24
runtime, including releases that ship Prisma schema migrations. It is written for an
operator with Vercel and Neon access who may not know ORCA internals. Use the
imperative steps and copy-paste commands as-is.

## 1. Overview

- ORCA on Vercel builds with `@sveltejs/adapter-vercel` and runs on the
  `nodejs24.x` runtime. The runtime is pinned explicitly in `svelte.config.js`
  (`runtime: 'nodejs24.x'`) for the `VERCEL=1` build path.
- The Vercel build runs `prisma migrate deploy` **then** `pnpm run build`, wired in
  [`vercel.json`](../vercel.json):
  ```json
  "buildCommand": "pnpm exec prisma migrate deploy --schema src/prisma/schema.prisma && pnpm run build"
  ```
  This mirrors the Docker entrypoint's migrate-before-serve behavior. It is
  idempotent — on a deploy with no new migrations, `migrate deploy` is a no-op.
- At runtime, ORCA uses the Neon serverless driver when `DATABASE_SERVERLESS=true`.
  Migrations use the **direct** (non-pooled) connection `DATABASE_URL_DIRECT`.

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
  - `ORG_CONFIG_ENCRYPTION_KEY`
  - Mail vars as used in production: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`,
    `MAILGUN_HOST` (or `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` /
    `SMTP_SECURE`).
  - S3/media vars as used: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
    `S3_BUCKET_NAME`, `S3_REGION`, `S3_URL`, `PUBLIC_MEDIA_DOMAIN`.
- [ ] Local Node 24 available for optional pre-flight: `node -v` reports `v24.x`.

## 3. Set Node.js 24 on Vercel (one-time / verify)

ORCA pins the runtime in the repo, but confirm the dashboard agrees:

**Repo (authoritative):**

- `svelte.config.js` sets `runtime: 'nodejs24.x'` for the `VERCEL=1` path.

**Dashboard (verify it aligns):**

- Vercel project **Settings → General → Node.js Version → 24.x**. The dashboard
  setting governs the build environment; keep it at 24.x so build and runtime match.

**After deploy, verify:** the Vercel build logs report Node `24.x`, and the deployed
functions show the `nodejs24.x` runtime.

## 4. Deploy when the release includes migrations

For a release that adds files under `src/prisma/migrations/`, choose one option.

### Option A — Automated (default, via `vercel.json`)

1. Merge the code to the production branch (`main`).
2. Confirm `DATABASE_URL_DIRECT` is set in the Vercel **Production** environment.
3. Trigger the deploy (push to `main`, or Vercel **Redeploy**).
4. The build runs `prisma migrate deploy` automatically, then builds the app.
5. In the build logs, confirm migrate **succeeds before** the Vite build starts.

Use Option A for ordinary additive migrations.

### Option B — Manual migration before deploy (safer for risky migrations)

Use this for migrations that need DBA review, take long table locks, or include
backfill steps not expressible as a plain Prisma migration.

1. Pull production env locally:
   ```bash
   vercel env pull .env.production.local --environment=production
   set -a && source .env.production.local && set +a
   ```
2. Review what is pending:
   ```bash
   pnpm exec prisma migrate status --schema src/prisma/schema.prisma
   ```
3. Apply migrations against production (uses `DATABASE_URL_DIRECT`):
   ```bash
   pnpm exec prisma migrate deploy --schema src/prisma/schema.prisma
   ```
4. Deploy via Vercel (push or **Redeploy**). The build-time `migrate deploy` then
   runs against an already-migrated database and is a no-op.

> **Break-glass only:** if you must keep the build from touching the database at all
> for a particularly sensitive migration, temporarily remove the `migrate deploy`
> prefix from `vercel.json`'s `buildCommand`, deploy, then restore it in a follow-up
> commit. Document why in the PR.

## 5. Deploy when there are no migrations

Follow Option A steps 1–3. `prisma migrate deploy` runs as a no-op and the app builds
and deploys normally.

## 6. Post-deploy verification

- [ ] Request `/healthz` on the production URL; expect a healthy response.
- [ ] Load the app root and complete one authenticated smoke flow (log in).
- [ ] Check Vercel function logs for Prisma/Neon connection errors.
- [ ] If the schema changed, confirm the new columns/tables are present via the app
      UI or a read-only SQL query against the Neon production branch.

## 7. Rollback

- **App code:** use Vercel **Instant Rollback** to the previous good deployment.
- **Schema:** Prisma migrations are **forward-only**. To undo a schema change, write a
  new forward-fix migration, or restore the database from a Neon branch / point-in-time
  restore. **Do not** run `prisma migrate reset` against production — it drops data.

## 8. Local Vercel bundle reproduction

Reproduce the Vercel build locally on Node 24 before deploying:

```bash
rm -rf build .svelte-kit .vercel
set -a && source .env && set +a
VERCEL=1 pnpm run build
```

Expect `.vercel/output/` with function `.vc-config.json` files reporting
`"runtime": "nodejs24.x"`. (This local command does not run `migrate deploy` — that
step is wired only into the Vercel platform build via `vercel.json`.)

## 9. Troubleshooting

| Symptom                              | Likely cause                               | Fix                                                                                        |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Build fails at `migrate deploy`      | Missing/wrong `DATABASE_URL_DIRECT`        | Set the **direct** Neon URL in Vercel Production env                                       |
| `Unsupported Node.js version`        | Build/runtime on old Node                  | Set project Node.js Version to 24.x; confirm `runtime: 'nodejs24.x'` in `svelte.config.js` |
| Runtime Prisma/Neon errors           | `DATABASE_SERVERLESS` not `true`           | Set `DATABASE_SERVERLESS=true`; redeploy                                                   |
| Migrate succeeds but app returns 500 | `DATABASE_URL` pooled string misconfigured | Verify the Neon **pooled** connection string                                               |

## Review gate (before production deploy)

A human confirms, before executing the production deploy:

1. The steps above match the actual Vercel project name and settings.
2. The production env-var list is complete for this deployment.
3. Option A vs Option B is the right choice for **this** release's migrations.
