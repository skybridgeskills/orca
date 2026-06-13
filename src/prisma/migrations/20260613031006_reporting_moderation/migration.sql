-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('ACHIEVEMENT', 'CLAIM', 'ENDORSEMENT');

-- CreateEnum
CREATE TYPE "ReporterStatus" AS ENUM ('ANONYMOUS', 'USER', 'MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModerationTier" AS ENUM ('ORG', 'SITE');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('SUSPEND');

-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'CONTENT_REPORTED';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "reportId" TEXT;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "originOrgId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reporterStatus" "ReporterStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "originOrgId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" "ModerationActionType" NOT NULL DEFAULT 'SUSPEND',
    "tier" "ModerationTier" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorOrgId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" TIMESTAMP(3),
    "liftedByUserId" TEXT,
    "liftedTier" "ModerationTier",

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_originOrgId_targetType_targetId_idx" ON "Report"("originOrgId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationAction_originOrgId_targetType_targetId_liftedAt_idx" ON "ModerationAction"("originOrgId", "targetType", "targetId", "liftedAt");

-- CreateIndex
CREATE INDEX "Message_reportId_idx" ON "Message"("reportId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_originOrgId_fkey" FOREIGN KEY ("originOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_originOrgId_fkey" FOREIGN KEY ("originOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
