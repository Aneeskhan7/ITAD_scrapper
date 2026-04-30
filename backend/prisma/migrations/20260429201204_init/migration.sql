-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "computeBudget" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 2,
    "crawlBudget" INTEGER NOT NULL DEFAULT 200,
    "schedule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "lastCrawled" TIMESTAMP(3),
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "yieldRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "proxyTier" INTEGER,
    "proxyId" TEXT,
    "errorType" TEXT,
    "errorDetail" TEXT,
    "pagesScraped" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "bodySnippet" TEXT,
    "classification" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "rawContent" JSONB,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DlqEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retry1At" TIMESTAMP(3),
    "retry2At" TIMESTAMP(3),
    "retry3At" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DlqEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxyHealth" (
    "id" TEXT NOT NULL,
    "proxyUrl" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "proxyType" TEXT NOT NULL,
    "ipDisplay" TEXT NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "blockedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUsed" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProxyHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetPattern" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMatched" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRegistry" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "currentJob" TEXT,
    "currentUrl" TEXT,
    "pagesScraped" INTEGER NOT NULL DEFAULT 0,
    "cpuPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "heartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Website_projectId_idx" ON "Website"("projectId");

-- CreateIndex
CREATE INDEX "Website_userId_idx" ON "Website"("userId");

-- CreateIndex
CREATE INDEX "Job_websiteId_idx" ON "Job"("websiteId");

-- CreateIndex
CREATE INDEX "Job_projectId_idx" ON "Job"("projectId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Result_websiteId_idx" ON "Result"("websiteId");

-- CreateIndex
CREATE INDEX "Result_projectId_idx" ON "Result"("projectId");

-- CreateIndex
CREATE INDEX "Result_userId_idx" ON "Result"("userId");

-- CreateIndex
CREATE INDEX "Result_classification_idx" ON "Result"("classification");

-- CreateIndex
CREATE INDEX "DlqEvent_projectId_idx" ON "DlqEvent"("projectId");

-- CreateIndex
CREATE INDEX "DlqEvent_errorType_idx" ON "DlqEvent"("errorType");

-- CreateIndex
CREATE INDEX "DlqEvent_status_idx" ON "DlqEvent"("status");

-- CreateIndex
CREATE INDEX "DlqEvent_userId_idx" ON "DlqEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProxyHealth_proxyUrl_key" ON "ProxyHealth"("proxyUrl");

-- CreateIndex
CREATE UNIQUE INDEX "TargetPattern_keyword_key" ON "TargetPattern"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRegistry_agentId_key" ON "AgentRegistry"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DlqEvent" ADD CONSTRAINT "DlqEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DlqEvent" ADD CONSTRAINT "DlqEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
