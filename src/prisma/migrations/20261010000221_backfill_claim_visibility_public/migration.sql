-- Release visibility backfill. Before this release, visibility was stored but
-- never enforced, and every claim and user default carried the old column
-- default COMMUNITY. Enforcement now 404s non-PUBLIC claims to outsiders, which
-- would break issued OB2 assertions and share links. Rows explicitly set to
-- PRIVATE or ACHIEVEMENT are untouched.
UPDATE "AchievementClaim" SET "visibility" = 'PUBLIC' WHERE "visibility" = 'COMMUNITY';
UPDATE "User" SET "defaultVisibility" = 'PUBLIC' WHERE "defaultVisibility" = 'COMMUNITY';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "defaultVisibility" SET DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "AchievementClaim" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';
