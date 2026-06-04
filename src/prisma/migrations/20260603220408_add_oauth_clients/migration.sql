-- CreateEnum
CREATE TYPE "OAuthClientType" AS ENUM ('USER_DELEGATED', 'CONFIDENTIAL_SERVICE');

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "clientType" "OAuthClientType" NOT NULL DEFAULT 'USER_DELEGATED',
    "clientName" TEXT NOT NULL,
    "clientUri" TEXT NOT NULL,
    "logoUri" TEXT NOT NULL,
    "tosUri" TEXT NOT NULL,
    "policyUri" TEXT NOT NULL,
    "softwareId" TEXT,
    "softwareVersion" TEXT,
    "contacts" TEXT[],
    "redirectUris" TEXT[],
    "scopes" TEXT[],
    "grantTypes" TEXT[],
    "responseTypes" TEXT[],
    "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'client_secret_basic',
    "clientSecretExpiresAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthorizationCode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scopes" TEXT[],
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL DEFAULT 'S256',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAuthorizationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccessToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "accessTokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "scopes" TEXT[],
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");

-- CreateIndex
CREATE INDEX "OAuthClient_organizationId_idx" ON "OAuthClient"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorizationCode_codeHash_key" ON "OAuthAuthorizationCode"("codeHash");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_userId_idx" ON "OAuthAuthorizationCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccessToken_accessTokenHash_key" ON "OAuthAccessToken"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccessToken_refreshTokenHash_key" ON "OAuthAccessToken"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_userId_organizationId_idx" ON "OAuthAccessToken"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
