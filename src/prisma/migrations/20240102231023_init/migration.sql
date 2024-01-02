-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'COMMUNITY', 'ACHIEVEMENT', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('GENERAL_ADMIN', 'BILLING_ADMIN', 'CONTENT_ADMIN');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('EMAIL', 'DID', 'URL');

-- CreateEnum
CREATE TYPE "AchievementStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'UNACCEPTED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "url" TEXT,
    "domain" TEXT NOT NULL,
    "logo" TEXT,
    "primaryColor" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "organizationId" TEXT NOT NULL,
    "orgRole" "RoleType",
    "defaultVisibility" "Visibility" NOT NULL DEFAULT 'COMMUNITY',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identifier" (
    "id" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL DEFAULT 'EMAIL',
    "identifier" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'COMMUNITY',

    CONSTRAINT "Identifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "achievementType" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "criteriaId" TEXT,
    "criteriaNarrative" TEXT,
    "creatorProfileId" TEXT,
    "json" JSONB NOT NULL,
    "identifier" TEXT NOT NULL,
    "image" TEXT,
    "achievementStatus" "AchievementStatus" NOT NULL DEFAULT 'ACTIVE',
    "categoryId" TEXT,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "claimable" BOOLEAN NOT NULL DEFAULT false,
    "claimRequiresId" TEXT,
    "reviewRequiresId" TEXT,
    "reviewsRequired" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AchievementConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1000,

    CONSTRAINT "AchievementCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementCredential" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "subjectId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "profileId" TEXT,

    CONSTRAINT "AchievementCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementClaim" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "credentialId" TEXT,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "json" JSONB NOT NULL DEFAULT '{}',
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'UNACCEPTED',
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatorId" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "visibility" "Visibility" NOT NULL DEFAULT 'COMMUNITY',

    CONSTRAINT "AchievementClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimEndorsement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creatorId" TEXT,
    "claimId" TEXT,
    "inviteeEmail" TEXT NOT NULL,
    "json" JSONB NOT NULL DEFAULT '{}',
    "achievementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'UNACCEPTED',
    "prereqId" TEXT,

    CONSTRAINT "ClaimEndorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT,
    "identifier" TEXT NOT NULL,
    "url" TEXT,
    "json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT false,
    "inviteId" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SigningKey" (
    "id" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "publicKeyMultibase" TEXT NOT NULL,
    "privateKeyMultibase" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "SigningKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Identifier_organizationId_identifier_key" ON "Identifier"("organizationId", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_organizationId_identifier_key" ON "Achievement"("organizationId", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementConfig_achievementId_key" ON "AchievementConfig"("achievementId");

-- CreateIndex
CREATE INDEX "AchievementCredential_subjectId_idx" ON "AchievementCredential"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementClaim_credentialId_key" ON "AchievementClaim"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementClaim_userId_achievementId_key" ON "AchievementClaim"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimEndorsement_creatorId_achievementId_inviteeEmail_key" ON "ClaimEndorsement"("creatorId", "achievementId", "inviteeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_organizationId_identifier_key" ON "Profile"("organizationId", "identifier");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Identifier" ADD CONSTRAINT "Identifier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Identifier" ADD CONSTRAINT "Identifier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AchievementCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementConfig" ADD CONSTRAINT "AchievementConfig_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementConfig" ADD CONSTRAINT "AchievementConfig_claimRequiresId_fkey" FOREIGN KEY ("claimRequiresId") REFERENCES "Achievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementConfig" ADD CONSTRAINT "AchievementConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementConfig" ADD CONSTRAINT "AchievementConfig_reviewRequiresId_fkey" FOREIGN KEY ("reviewRequiresId") REFERENCES "Achievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementCategory" ADD CONSTRAINT "AchievementCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementCredential" ADD CONSTRAINT "AchievementCredential_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementCredential" ADD CONSTRAINT "AchievementCredential_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementCredential" ADD CONSTRAINT "AchievementCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementCredential" ADD CONSTRAINT "AchievementCredential_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementClaim" ADD CONSTRAINT "AchievementClaim_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementClaim" ADD CONSTRAINT "AchievementClaim_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementClaim" ADD CONSTRAINT "AchievementClaim_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "AchievementCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementClaim" ADD CONSTRAINT "AchievementClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementClaim" ADD CONSTRAINT "AchievementClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEndorsement" ADD CONSTRAINT "ClaimEndorsement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEndorsement" ADD CONSTRAINT "ClaimEndorsement_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AchievementClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEndorsement" ADD CONSTRAINT "ClaimEndorsement_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEndorsement" ADD CONSTRAINT "ClaimEndorsement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEndorsement" ADD CONSTRAINT "ClaimEndorsement_prereqId_fkey" FOREIGN KEY ("prereqId") REFERENCES "AchievementClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "ClaimEndorsement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SigningKey" ADD CONSTRAINT "SigningKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
