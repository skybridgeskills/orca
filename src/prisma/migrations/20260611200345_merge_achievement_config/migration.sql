-- Flatten the 1:1 `AchievementConfig` satellite into `Achievement`.
-- Order is data-safe: add columns -> copy + merge json -> add self-relation FKs ->
-- drop the old table (and its FKs). Hand-authored: the Prisma-generated DDL would
-- drop the table before copying its data.

-- 1. Add columns on `Achievement` (nullable / defaulted so existing rows stay valid).
--    Only the queryable/joined fields become columns: `claimable` (a likely list
--    filter) and the two self-relation FKs. `reviewsRequired` is read-after-fetch
--    only, so it lives in `json` (see step 2), not as a column.
ALTER TABLE "Achievement" ADD COLUMN     "claimable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "claimRequiresId" TEXT,
ADD COLUMN     "reviewRequiresId" TEXT;

-- 2. Copy scalar config fields onto the achievement and merge the config json into
--    `Achievement.json`. The `a."json" || ...` order preserves pre-existing json
--    keys (e.g. `alignment`) and only adds/overrides the merged config keys.
--    `reviewsRequired` moves into `json` (its single source of truth). `capabilities`
--    / `claimTemplate` are copied verbatim from the config json *only when present*
--    (the `?` key-existence guard avoids writing a null-valued top-level key when an
--    old row lacks them); nested values such as `capabilities.inviteRequires: null`
--    are preserved exactly.
UPDATE "Achievement" a SET
  "claimable"        = c."claimable",
  "claimRequiresId"  = c."claimRequiresId",
  "reviewRequiresId" = c."reviewRequiresId",
  "json" = COALESCE(a."json", '{}'::jsonb)
           || jsonb_build_object('reviewsRequired', c."reviewsRequired")
           || (CASE WHEN c."json" ? 'capabilities'
                    THEN jsonb_build_object('capabilities', c."json"->'capabilities')
                    ELSE '{}'::jsonb END)
           || (CASE WHEN c."json" ? 'claimTemplate'
                    THEN jsonb_build_object('claimTemplate', c."json"->'claimTemplate')
                    ELSE '{}'::jsonb END)
FROM "AchievementConfig" c
WHERE c."achievementId" = a."id";

-- 3. Self-relation FKs for the merged columns
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_claimRequiresId_fkey" FOREIGN KEY ("claimRequiresId") REFERENCES "Achievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_reviewRequiresId_fkey" FOREIGN KEY ("reviewRequiresId") REFERENCES "Achievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Drop the now-redundant satellite table (and its foreign keys)
ALTER TABLE "AchievementConfig" DROP CONSTRAINT "AchievementConfig_achievementId_fkey";
ALTER TABLE "AchievementConfig" DROP CONSTRAINT "AchievementConfig_claimRequiresId_fkey";
ALTER TABLE "AchievementConfig" DROP CONSTRAINT "AchievementConfig_organizationId_fkey";
ALTER TABLE "AchievementConfig" DROP CONSTRAINT "AchievementConfig_reviewRequiresId_fkey";
DROP TABLE "AchievementConfig";
