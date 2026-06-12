# Merge AchievementConfig into Achievement

- Status: Accepted
- Date: 2026-06-09
- Deciders: ORCA maintainers

## Context

Claim/review configuration for a badge lived in a separate `AchievementConfig`
table in a strict 1:1 relationship with `Achievement` (`achievementId @unique`).
It held `claimable`, `claimRequiresId`, `reviewRequiresId`, `reviewsRequired`, and
a `json` blob (`capabilities.inviteRequires`, `claimTemplate`).

This satellite added cost and risk on every code path:

- **Reads** join through the relation: every load of an achievement that needs its
  config does an `include: { achievementConfig: { include: { claimRequires,
reviewRequires } } }`, and consumers reach through `achievement.achievementConfig?.X`.
- **Writes** are two steps — a `prisma.achievementConfig.upsert` plus a
  `prisma.achievement.update` — that are not transactional (the create handler even
  carried a `// TODO update records in a transaction`).
- The split makes the _source of truth_ for a single conceptual entity ambiguous,
  and there is no second config row a `1:1` table could ever justify.

`Achievement.json` already carried OB3-shaped data (`alignment`), and upcoming work
(rubric `resultDescriptions`, steward review notifications) will add more
config-like fields. A field-usage audit showed only `claimRequiresId` is ever used
in a standalone `where` (a delete in `achievements/[id]/+page.server.ts`); the
relations `claimRequires`/`reviewRequires` are `include`d; everything else is read
after fetch.

## Decision

Flatten `AchievementConfig` into `Achievement` and drop the table.

1. **Column-vs-json placement rule.** Fields that are queried or joined become
   columns on `Achievement`; everything else moves into `Achievement.json`.
   - Columns: `claimable`, `claimRequiresId`, `reviewRequiresId`.
   - JSON: `reviewsRequired`, `capabilities.inviteRequires`, `claimTemplate` (and
     future `resultDescriptions`).
2. **Self-relations.** `claimRequiresId` and `reviewRequiresId` become self-relations
   on `Achievement`: `claimRequires` / `claimRequiredBy` (relation `ClaimPrereq`) and
   `reviewRequires` / `reviewEnabledBy` (relation `ReviewBadge`), replacing the old
   `EnablesClaimOf` / `EnablesReviewOf` relations that pointed at the config.
3. **What earns a column.** A field is a column only if it is filtered, sorted, or
   joined on; everything read after the achievement is already loaded lives in `json`.
   - `claimRequiresId` / `reviewRequiresId` are columns because they back the
     self-relations (a Prisma relation needs a real FK column) and `claimRequiresId`
     is used in a standalone `where`.
   - `claimable` is kept a column: it has no `where` today but is the one config flag
     with a plausible near-term list filter ("achievements a user can claim"), it is a
     clean boolean, and it is trivially indexable later.
   - `reviewsRequired` is **json-only**. It is read after fetch (a parameter of the
     review flow for an already-loaded claim), never filtered on, so it does not earn
     a column. Keeping it out of the columns avoids a dual source of truth.
4. **Single destructive migration, hand-authored SQL.** One migration adds the
   columns and self-relation FKs, copies each config row onto its achievement while
   merging the config `json` into `Achievement.json` (`a.json || …`, preserving
   pre-existing keys such as `alignment`), then drops `AchievementConfig`. The
   Prisma-generated DDL drops the table before copying, so the SQL is hand-ordered.
   `capabilities` / `claimTemplate` are copied verbatim only when present (a key-
   existence guard), preserving nested values like `inviteRequires: null` exactly.
5. **Accept the `/api/v1/achievements` response-shape change.** The endpoint no
   longer nests `achievementConfig`; config fields surface on the achievement and in
   its `json`. The typed shape in `app.d.ts` (`AchievementConfig` /
   `ConfigWithRelations`) is replaced by `AchievementWithJson` /
   `AchievementWithRelations`.

## Consequences

- A single source of truth and atomic writes: create/edit/award collapse the
  two-step config-upsert + achievement-update into one `prisma.achievement.{create,
update}`, removing the non-transactional gap.
- Reads drop a join layer; `achievement.achievementConfig?.X` becomes
  `achievement.X` / `achievement.json?.X` across ~20 consumer files (servers, data
  layer, store, UI, OB2/OB3 emitters).
- **The migration is destructive and one-way.** There is no down-path that restores
  the dropped table's rows; the copy must be verified before the drop. JSON merge
  must preserve pre-existing `Achievement.json` keys.
- **The public API contract changed.** `/api/v1/achievements` consumers (the client
  `achievementStore`, OB2/OB3 surfaces) must read the flat shape. This is a breaking
  change for any external consumer of that endpoint.
- The delete in `achievements/[id]/+page.server.ts` that cleared dependent configs
  (`where: { claimRequiresId: id }`) becomes a self-relation update on `Achievement`
  (`updateMany … { claimRequiresId: null, claimable: false }`), preserving intent.
- This merge is sequenced **first**; the rubrics/results plan builds on the merged
  model and the badge-steward plan is re-baselined onto it afterward.

## Alternatives considered

- **Keep the 1:1 satellite.** Rejected: it provides no extensibility a flattened
  model lacks, and keeps the join/upsert overhead and the non-transactional write.
- **Move everything to `json` with no columns.** Rejected: `claimRequiresId` is used
  in a `where` and both prereq fields back self-relations, which require real FK
  columns; pushing them into json would lose query/relation support.
