# Production migrations run from a manually started GitHub Actions workflow

- Status: Accepted
- Date: 2026-10-23
- Deciders: ORCA maintainers
- Amends: [2026-10-09-manual-production-migrations](2026-10-09-manual-production-migrations.md) (decision 2)

## Context

[2026-10-09-manual-production-migrations](2026-10-09-manual-production-migrations.md)
moved production migrations out of the Vercel build: the operator applies them
by hand, just before **Promote**. In practice "by hand" meant putting a production
`DATABASE_URL_DIRECT` into a local `.env` or shell and running
`prisma migrate deploy` from a laptop, once per production database.

- Skybridge runs two production deployments (US and EU), each with its own Neon
  database. So production connection strings had to be copied onto laptops.
- ORCA is open source, and the GitHub repository is public. Skybridge's
  deployments are specific to Skybridge. A fork runs its own deployments under
  its own names, so the code should not list Skybridge's.
- Actions logs on a public repository are public.

## Decision

1. **Production migrations run from the `Migrate database` workflow**
   (`.github/workflows/migrate.yml`), started by hand (`workflow_dispatch`). It is
   still a manual step, timed by the operator just before Promote. Only where it
   runs changes.
2. **The target is a GitHub environment, picked from a dropdown.** The input has
   `type: environment`, so the list comes from the repository's Settings →
   Environments. The workflow names no environments. Each environment holds one
   secret, `DATABASE_URL_DIRECT` (the direct, non-pooled connection), which the
   job uses for both `DATABASE_URL` and `DATABASE_URL_DIRECT`.
3. **Each environment is restricted to the default branch** (deployment branch
   policy). This is required operator setup, documented in
   `docs/deployment-vercel.md`. Required reviewers are optional.
4. **Migrations come from the commit the run is on**, normally the tip of `main`.
   An optional `sha` input selects an earlier commit instead. It is accepted only
   if it is on the default branch, so it can't get around the branch policy.
5. **Each run prints `migrate status`, then runs `migrate deploy`.** The run
   summary records the environment, the commit, and the UTC start time (the
   point-in-time restore target). Taking a backup stays manual.
6. **Hardening:** the database host is masked in the logs; inputs reach scripts
   only through environment variables; runs against the same environment never
   overlap and are never cancelled; the token is read-only (`contents: read`).
7. Each run keeps GitHub's default deployment record on the environment, which
   serves as the history of migrations.

Decisions 1 and 3 of the 2026-10-09 ADR stand: the Vercel build never migrates,
and the Docker entrypoint still migrates on container start.

Alternatives considered:

- **A `choice` input listing the environments:** rejected. It writes Skybridge's
  deployments into open-source code, and forks would have to edit the workflow.
- **A free-text `string` input:** no dropdown, and typos are easy. It would only
  be the fallback if `type: environment` didn't exist.
- **Repository-level secrets with a suffix per deployment** (for example
  `DATABASE_URL_DIRECT_EU`): rejected. Every workflow on any branch can read
  them, and there is no branch policy or reviewer gate.
- **Migrating automatically on merge or on Promote:** rejected for the reasons in
  the 2026-10-09 ADR. Merge happens before the operator chooses to go live, and
  Promote doesn't rebuild or run anything.

## Consequences

- Production connection strings live only in GitHub environments, not on
  laptops. The laptop procedure remains as a documented fallback.
- The branch policy is what stops someone with write access from running a
  feature branch's migration SQL against production. If an environment is
  created without it, that protection is missing.
- Migrations still run before Promote, so the outage window for breaking
  migrations described in the 2026-10-09 ADR is unchanged.
- A fork uses the workflow by creating its own environments with a
  `DATABASE_URL_DIRECT` secret. With no environments configured, there is nothing
  to choose.
- Run logs are public. The host is masked and the connection string is a masked
  secret, but nothing else database-specific should be printed in this workflow.
