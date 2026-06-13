-- AlterEnum
ALTER TYPE "IdentifierType" ADD VALUE 'PASSKEY';

-- AlterTable
ALTER TABLE "Identifier" ADD COLUMN     "json" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "passkeyChallenge" TEXT,
ADD COLUMN     "passkeyChallengeExpiresAt" TIMESTAMP(3);
