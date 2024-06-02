-- AlterTable
ALTER TABLE "AchievementConfig" ADD COLUMN     "json" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "json" JSONB NOT NULL DEFAULT '{}';
