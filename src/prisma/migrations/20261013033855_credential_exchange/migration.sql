-- AlterTable
ALTER TABLE "AchievementCredential" ADD COLUMN     "claimId" TEXT;

-- CreateTable
CREATE TABLE "CredentialExchange" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialExchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CredentialExchange_expiresAt_idx" ON "CredentialExchange"("expiresAt");

-- CreateIndex
CREATE INDEX "AchievementCredential_claimId_idx" ON "AchievementCredential"("claimId");

-- AddForeignKey
ALTER TABLE "AchievementCredential" ADD CONSTRAINT "AchievementCredential_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AchievementClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialExchange" ADD CONSTRAINT "CredentialExchange_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AchievementClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialExchange" ADD CONSTRAINT "CredentialExchange_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill: every cached credential now knows the claim it was issued for.
UPDATE "AchievementCredential" AS c
SET "claimId" = a."id"
FROM "AchievementClaim" AS a
WHERE a."credentialId" = c."id" AND c."claimId" IS NULL;
