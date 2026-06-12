-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('REVIEW_NEEDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "json" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "achievementId" TEXT,
    "claimId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_userId_type_achievementId_createdAt_idx" ON "Message"("userId", "type", "achievementId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_organizationId_createdAt_idx" ON "Message"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
