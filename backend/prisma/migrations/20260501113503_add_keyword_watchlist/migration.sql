-- DropForeignKey
ALTER TABLE "DlqEvent" DROP CONSTRAINT "DlqEvent_projectId_fkey";

-- DropForeignKey
ALTER TABLE "DlqEvent" DROP CONSTRAINT "DlqEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_websiteId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Result" DROP CONSTRAINT "Result_websiteId_fkey";

-- DropForeignKey
ALTER TABLE "Website" DROP CONSTRAINT "Website_projectId_fkey";

-- AlterTable
ALTER TABLE "AgentRegistry" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "heartbeat" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DlqEvent" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "retry1At" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "retry2At" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "retry3At" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolvedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProxyHealth" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "cooldownUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastUsed" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "fullText" TEXT,
ADD COLUMN     "textHash" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "foundAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TargetPattern" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "firstSeen" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastMatched" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailDigestFrequency" TEXT NOT NULL DEFAULT 'instant',
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unsubscribeToken" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- Backfill unsubscribeToken for existing users (random unique value per row)
UPDATE "User" SET "unsubscribeToken" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') WHERE "unsubscribeToken" IS NULL;

-- Now enforce NOT NULL on the backfilled column
ALTER TABLE "User" ALTER COLUMN "unsubscribeToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "targetPagePatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "lastCrawled" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WatchKeyword" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "websiteId" TEXT,
    "keyword" TEXT NOT NULL,
    "matchMode" TEXT NOT NULL DEFAULT 'contains',
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordHit" (
    "id" TEXT NOT NULL,
    "watchKeywordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "resultId" TEXT,
    "pageUrl" TEXT NOT NULL,
    "pageTitle" TEXT,
    "matchedText" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notifiedInApp" BOOLEAN NOT NULL DEFAULT false,
    "notifiedEmail" BOOLEAN NOT NULL DEFAULT false,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchKeyword_userId_idx" ON "WatchKeyword"("userId");

-- CreateIndex
CREATE INDEX "WatchKeyword_projectId_idx" ON "WatchKeyword"("projectId");

-- CreateIndex
CREATE INDEX "WatchKeyword_websiteId_idx" ON "WatchKeyword"("websiteId");

-- CreateIndex
CREATE INDEX "WatchKeyword_keyword_idx" ON "WatchKeyword"("keyword");

-- CreateIndex
CREATE INDEX "WatchKeyword_status_idx" ON "WatchKeyword"("status");

-- CreateIndex
CREATE INDEX "KeywordHit_userId_status_idx" ON "KeywordHit"("userId", "status");

-- CreateIndex
CREATE INDEX "KeywordHit_websiteId_idx" ON "KeywordHit"("websiteId");

-- CreateIndex
CREATE INDEX "KeywordHit_watchKeywordId_idx" ON "KeywordHit"("watchKeywordId");

-- CreateIndex
CREATE INDEX "KeywordHit_foundAt_idx" ON "KeywordHit"("foundAt");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordHit_watchKeywordId_resultId_position_key" ON "KeywordHit"("watchKeywordId", "resultId", "position");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Result_textHash_idx" ON "Result"("textHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");

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

-- AddForeignKey
ALTER TABLE "WatchKeyword" ADD CONSTRAINT "WatchKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchKeyword" ADD CONSTRAINT "WatchKeyword_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchKeyword" ADD CONSTRAINT "WatchKeyword_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordHit" ADD CONSTRAINT "KeywordHit_watchKeywordId_fkey" FOREIGN KEY ("watchKeywordId") REFERENCES "WatchKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordHit" ADD CONSTRAINT "KeywordHit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordHit" ADD CONSTRAINT "KeywordHit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordHit" ADD CONSTRAINT "KeywordHit_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

