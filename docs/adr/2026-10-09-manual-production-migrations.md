# Production migrations run by hand, not in the Vercel build

- Status: Accepted
- Date: 2026-10-09
- Deciders: ORCA maintainers

## Context

`vercel.json` ran `prisma migrate deploy` in front of `pnpm run build`, mirroring
the Docker entrypoint's migrate-before-serve. On Vercel that does not do what it
does in Docker:

- A push to the production branch creates a **staged Production build with the
  Production environment**. Migrating in the build therefore migrated the
  production database at merge time, while the previous deployment was still
  serving traffic.
- **Promote does not rebuild**, so the migration could not be timed to Promote.
  Whatever ran in the build had already run by the time anyone decided to go live.
- Releases can contain **breaking migrations**. For example,
  `merge_achievement_config` copies `AchievementConfig` into `Achievement` and then
  drops the table, which the previous code still reads.
- **Instant Rollback cannot undo a migration.** Rolling back the code after a
  breaking migration leaves old code on a schema it can't use.
- Preview builds would, in the same way, migrate whatever database their Preview
  environment points at.

## Decision

1. **The Vercel build never runs migrations.** `buildCommand` is `pnpm run build`.
2. **The operator applies production migrations by hand**, in this order:
   take a backup and record the UTC timestamp; from a checkout of the merged
   commit, run `prisma migrate status` and then `prisma migrate deploy` against the
   **direct** connection; then **Promote** the staged deployment immediately. The
   steps are in `docs/deployment-vercel.md` §4.
3. **The Docker deployment path is unchanged.** Its entrypoint still migrates on
   container start, where there is no separate build-then-promote step.

Alternatives considered:

- **Migrate in the build** (the previous default): rejected for the reasons above.
- **A migrate script guarded by `VERCEL_ENV`**: it would stop Preview builds from
  migrating, but Production builds would still migrate at merge time, before
  Promote.
- **Expand/contract migrations** (ship the additive half, drop later): would avoid
  the outage window for the table drop. Declined for this release; still an option
  for future breaking changes.

## Consequences

- The operator decides exactly when the production schema changes, and can take
  a backup immediately before.
- For a breaking migration there is a short outage between `migrate deploy` and
  Promote, while the old code runs on the new schema. Additive migrations have no
  such window.
- Rolling back after a breaking migration needs a **database restore** (point in
  time to the recorded timestamp, or the backup) as well as Instant Rollback.
- If the operator forgets to migrate, the new deployment fails as soon as it
  touches a new column or table. The checklist in `docs/deployment-vercel.md`
  guards against this, and running the migration fixes it without a redeploy.
- Preview builds never migrate their databases; a Preview database that needs a
  new schema is migrated by hand too.
